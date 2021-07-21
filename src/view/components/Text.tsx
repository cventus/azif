import styled, { css } from 'styled-components'

interface TextStyle {
  ui?: boolean
  oneLine?: boolean
  underline?: boolean
  secondary?: boolean
  blank?: boolean
}

export const Text = styled.span<TextStyle>`
  font-family: ${({ ui }) => (ui ? 'sans' : 'serif')};
  ${(props) =>
    props.oneLine &&
    css`
      display: block;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    `}
  ${(props) =>
    props.blank &&
    css`
      visibility: hidden;
    `}
    ${(props) =>
    props.secondary &&
    css`
      color: #666666;
    `}
    ${(props) =>
    props.underline &&
    css`
      text-decoration: underline;
    `};
`

export const PlainLink = styled.a`
  color: black;
  text-decoration: none;
  margin: 1em;
  width: 14rem;

  &:visited {
    color: black;
  }

  &:hover {
    color: black;
  }
`
