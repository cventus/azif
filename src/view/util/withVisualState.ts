import {
  AnimationEventHandler,
  ComponentProps,
  createElement,
  ReactElement,
  ReactNode,
  Ref,
  RefAttributes,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

interface VisualState<S> {
  state: S
  from?: S
  to?: S
}
interface RenderVisualStateProps<S> {
  state: S
  children: (animationState: VisualState<S>) => ReactNode
}

type RenderVisualState<P, S> = (
  props: Omit<P, 'children'> & RenderVisualStateProps<S>,
) => ReactElement

interface VisualStateAttributes extends RefAttributes<Element> {
  className?: string
  onAnimationEnd?: AnimationEventHandler
}

type VisualStateComponent =
  | keyof JSX.IntrinsicElements
  | React.ComponentType<VisualStateAttributes>

// A HOC that enhances a component with a state property. When the state
// changes, animated transitions are triggered by adding CSS classes to the
// component. The visual state might lag behind the actual state during the
// transitions.
export function withVisualState<
  Component extends VisualStateComponent,
  State extends string,
  Properties = ComponentProps<Component>
>(
  InnerComponent: Component,
  states?: State[],
): RenderVisualState<Properties, State> {
  const result: RenderVisualState<Properties, State> = (props) => {
    const {
      state: desiredState,
      children: renderChildren,
      ...otherProps
    } = props

    const ref = useRef<Element>()
    const [current, setCurrent] = useState<VisualState<State>>({
      state: desiredState,
    })

    // After render, check if we need to transition
    useLayoutEffect(() => {
      let style: CSSStyleDeclaration | undefined
      if (ref.current) {
        style = window.getComputedStyle(ref.current)
      }
      const needsToTransition = current.state !== desiredState
      if (needsToTransition) {
        const isTransitioning = current.from || current.to
        if (isTransitioning) {
          let isInstant = true
          if (style) {
            // We assume that an animation has been set on the element as an
            // effect of the transition. Otherwise, immediately jump to the next
            // step.
            const duration = style.getPropertyValue('animation-duration')
            isInstant = duration === '0s'
          }
          if (isInstant) {
            setCurrent({ state: desiredState })
          }
        } else {
          // Begin new transition
          setCurrent({
            to: desiredState,
            state: current.state,
          })
        }
      }
    }, [current, desiredState, ref])

    const onAnimationEnd: AnimationEventHandler = useCallback(
      (e) => {
        if (e.target === ref.current) {
          if (current.from !== undefined) {
            setCurrent({ state: current.state })
          } else if (current.to !== undefined) {
            setCurrent({
              from: current.state,
              state: current.to,
            })
          }
        }
      },
      [current, desiredState, ref],
    )

    // Apply animation state classes
    const fromClass = current.from && `FROM_${current.from}`
    const toClass = current.to && `TO_${current.to}`
    const stateClass = current.state && `STATE_${current.state}`
    const className = [fromClass, stateClass, toClass]
      .filter((x) => Boolean(x))
      .join(' ')

    return createElement(
      InnerComponent,
      {
        ...otherProps,
        ref: ref as Ref<Element>,
        onAnimationEnd,
        className,
      },
      renderChildren(current),
    )
  }
  return result
}
