const { execSync } = require('child_process')

function exec(command, options = {}) {
  return execSync(command, { stdio: 'pipe', encoding: 'utf8', ...options }).trim()
}

function main() {
  console.log('🚀 GitHub Push Deploy Helper')
  console.log('================================')

  let branch
  try {
    branch = exec('git rev-parse --abbrev-ref HEAD')
  } catch (error) {
    console.error('❌ Unable to determine current Git branch. Are you in a Git repository?')
    process.exit(1)
  }

  console.log(`Current branch: ${branch}`)

  let status
  try {
    status = exec('git status --porcelain')
  } catch (error) {
    console.error('❌ Unable to check Git status.')
    process.exit(1)
  }

  if (status) {
    console.error('⚠️ Uncommitted changes detected. Please commit or stash them before pushing.')
    console.error(status)
    process.exit(1)
  }

  console.log('✅ Working tree clean.')
  console.log(`Pushing branch ${branch} to origin...`)

  try {
    execSync(`git push origin ${branch}`, { stdio: 'inherit' })
    console.log('✅ Push complete.')
    console.log('If Render is connected to this repository and branch, deployment should start automatically.')
  } catch (error) {
    console.error('❌ Git push failed.')
    process.exit(1)
  }
}

main()
