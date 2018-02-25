import Typography from 'typography'

const nativeFontStack = [
  '-apple-system',
  // Chrome < 56 for OS X (San Francisco)
  'BlinkMacSystemFont',
  // Windows
  'Segoe UI',
  // Android
  'Roboto',
  // Basic web fallback
  'Helvetica Neue',
  'Arial',
  'sans-serif',
  // Emoji fonts
  'Apple Color Emoji',
  'Segoe UI Emoji',
  'Segoe UI Symbol'
]

const typography = new Typography({
  headerFontFamily: nativeFontStack,
  bodyFontFamily: nativeFontStack,

  headerColor: '#333',
  bodyColor: '#999',

  baseLineHeight: 1.5,
  blockMarginBottom: 1 / 1.5,

  // googleFonts: [
  //   {
  //     name: 'Roboto',
  //     styles: ['700', '900']
  //   },
  //   {
  //     name: 'Hind',
  //     styles: ['300', '400']
  //   }
  // ],

  overrideStyles: () => ({
    // blockMarginBottom
    [`img`]: {
      marginBottom: 0
    },
    [`p`]: {
      whiteSpace: 'pre-wrap'
    }
  })
})

export default typography
