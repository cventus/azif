import { main } from './main'
;(async () => {
  let destroy = await main()
  let isUpdating = false

  if (module.hot) {
    module.hot.accept(['./main'], async (updates) => {
      console.log('Updates:', updates)
      if (!isUpdating) {
        isUpdating = true
        await destroy()
        destroy = await main()
        isUpdating = false
      }
    })
  }
})()
