import React from 'react'
import DocumentTitle from 'react-document-title'
import { Link } from 'react-router'
import kebabCase from 'lodash/kebabCase'
import get from 'lodash/get'
import typography from '../blog-typography'
const { rhythm, scale } = typography
const profilePic = require('../images/sam-square.jpg')
import ReadNext from '../components/ReadNext'
const DisqusThread = require('react-disqus-thread')
//import { query } from '../components/ReadNext'
const query = `
readNext___file {
  children {
    ... on MarkdownRemark {
      path
      excerpt(pruneLength: 200)
      frontmatter {
        title
      }
    }
  }
}
`

class BlogPostRoute extends React.Component {
  render () {
    const post = this.props.data.markdownRemark
    console.log(post)
    const siteTitle = this.props.data.site.siteMetadata.title

    let tags
    let tagsSection
    if (this.props.data.markdownRemark.frontmatter.tags) {
      const tagsArray = this.props.data.markdownRemark.frontmatter.tags
      tags = tagsArray.map((tag, i) => {
        const divider = i < tagsArray.length - 1 && <span>{' | '}</span>
        return (
          <span key={tag}>
            <Link
              to={`/tags/${kebabCase(tag)}/`}
            >
              {tag}
            </Link>
            {divider}
          </span>
        )
      })
      tagsSection = (
        <em
          style={{
            ...scale(-1/5),
            display: 'block',
            marginBottom: rhythm(1),
          }}
        >
          Tagged with {tags}
        </em>
      )
    }

    return (
      <DocumentTitle title={`${siteTitle} | ${post.frontmatter.title}`}>
        <div>
          <h1>{post.frontmatter.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: post.html }} />
          {tagsSection}
          <p
            style={{
              ...scale(-1/5),
              display: 'block',
              marginBottom: rhythm(1),
            }}
          >
            Posted {post.frontmatter.date}
          </p>
          <hr
            style={{
              marginBottom: rhythm(1),
            }}
          />
          <ReadNext nextPost={get(post, `frontmatter.readNext.children[0]`)} />
          <p
            style={{
              marginBottom: rhythm(6),
            }}
          >
            <img
              src={profilePic}
              style={{
                float: 'left',
                marginRight: rhythm(1/4),
                marginBottom: 0,
                width: rhythm(2),
                height: rhythm(2),
                borderRadius: rhythm(1)
              }}
            />
            <strong>{this.props.data.site.siteMetadata.author}</strong> is an econ nerd turned programmer. <a href="https://twitter.com/calcsam">You should follow him on Twitter</a>
          </p>
          <DisqusThread
            shortname="moores-hand"
            title={post.title}
            url={`https://mooreshand.com/${this.props.location.pathname}`}
          />
        </div>
      </DocumentTitle>
    )
  }
}

export default BlogPostRoute

export const pageQuery = `
  query BlogPostByPath($path: String!) {
    site {
      siteMetadata {
        title
        author
      }
    }
    markdownRemark(path: { eq: $path }) {
      html
      frontmatter {
        title
        tags
        date(formatString: "MMMM DD, YYYY")
        readNext: ${query}
      }
    }
  }
`
