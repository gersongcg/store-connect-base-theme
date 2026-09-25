export function setContainerToWindowHeight(container) {
  const header = document.querySelector('[data-header]')
  const offset = header.offsetHeight

  container.style.height = `calc(100vh - ${offset}px)`
}
