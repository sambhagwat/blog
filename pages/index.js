import React from 'react'
import DocumentTitle from 'react-document-title'
import { Link } from 'react-router'
import typography from '../blog-typography'
import 'styles/styles.css'

const rhythm = typography.rhythm
const profilePic = require('../images/sam-square.jpg')
console.log(profilePic)

class BlogIndexRoute extends React.Component {
  render () {
    const posts = this.props.data.allMarkdownRemark.edges
    const siteTitle = this.props.data.site.siteMetadata.title

    return (
      <DocumentTitle title={siteTitle}>
        <div>
          <p
            style={{
              marginBottom: rhythm(2.5),
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
            Written by <strong>{this.props.data.site.siteMetadata.author}</strong>, an econ nerd turned programmer. You should <a href="https://twitter.com/calcsam">follow him on Twitter</a>
          </p>
          <ul>
            {posts.map((post) => (
              <li
                key={post.node.path}
              >
                <Link
                  style={{
                    textDecoration: 'none',
                  }}
                  to={post.node.path}
                >
                  {post.node.frontmatter.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </DocumentTitle>
    )
  }
}

export default BlogIndexRoute

export const pageQuery = `
  {
    site {
      siteMetadata {
        title
        author
      }
    }
    allMarkdownRemark(
      first: 2000,
      sortBy: {
        fields: [frontmatter___date]
        order: DESC
      },
      frontmatter: {
        draft: {
          ne: true
        }
      }
    ) {
      edges {
        node {
          path
          frontmatter {
            title
          }
        }
      }
    }
  }
`
