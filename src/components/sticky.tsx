/* eslint-disable @typescript-eslint/ban-ts-comment */

import React, { Component } from 'react'
import PropTypes from 'prop-types'

const isSticky = ({ offsetX, offsetY }: { offsetX: number; offsetY: number }) => {
  if (offsetX && global.scrollX && global.scrollX >= offsetX) return true
  if (offsetY && global.scrollY && global.scrollY >= offsetY) return true
  return false
}

class Sticky extends Component {
  hasScrolled?: boolean

  static propTypes = {
    offsetX: PropTypes.number,
    offsetY: PropTypes.number,
    children: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
    render: PropTypes.func,
  }

  static defaultProps = {
    offsetX: null,
    offsetY: null,
    children: ({ ...props }) => <div {...props} />,
    // @ts-expect-error
    render: ({ children, ...props }) => (typeof children === 'function' ? children(props) : children),
  }

  // @ts-expect-error
  state = { sticky: isSticky(this.props) }

  componentDidMount() {
    global.addEventListener('scroll', this.handleScroll)
  }

  componentWillUnmount() {
    global.removeEventListener('scroll', this.handleScroll)
  }

  handleScroll = () => {
    if (!this.hasScrolled) requestAnimationFrame(this.updateSticky)

    this.hasScrolled = true
    requestAnimationFrame(this.handleScroll)
  }

  updateSticky = () => {
    // @ts-expect-error
    if (this.state.sticky !== isSticky(this.props)) {
      // @ts-expect-error
      this.setState(({ sticky }) => ({ sticky: !sticky }))
    }

    this.hasScrolled = false
  }

  render() {
    // @ts-expect-error
    const { render, ...props } = this.props
    const { sticky } = this.state

    return render({ sticky, ...props })
  }
}

export default Sticky

// const StickyHeader = (function(window, document) {
//   const stickyClass = 'sticky_header'
//   const header = document.querySelector('.' + stickyClass)
//   const hiddenClass = stickyClass + '-hidden'

//   let hasScrolled = false

//   const _redraw = function() {
//     // This is costly to performance but unavoidable
//     const pageY = window.scrollY

//     // Put it away
//     if (pageY === 0) {
//       header.classList.remove(hiddenClass)
//     } else {
//       header.classList.add(hiddenClass)
//     }

//     hasScrolled = false
//   }

//   // Important: keep this function as performant as possible!
//   const _onScroll = function() {
//     if (!hasScrolled) {
//       window.requestAnimationFrame(_redraw)
//     }
//     hasScrolled = true
//     window.requestAnimationFrame(_onScroll)
//   }

//   _onScroll()
// })(window, document)
