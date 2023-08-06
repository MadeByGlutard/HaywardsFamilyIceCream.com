import useSiteMetadata from '../hooks/use-site-metadata'

export default ({ title, description }: { title?: string; description?: string }) => {
  const siteMetadata = useSiteMetadata()

  const siteTitle = siteMetadata.title
  const siteDescription = siteMetadata.description

  title = [title, siteTitle].filter(Boolean).join(' | ')
  description = description ?? siteDescription

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </>
  )
}
