import injectProcessEnv from 'rollup-plugin-inject-process-env'
import { join, relative } from 'path'
import { promises as fs } from 'fs'
import replace from '@rollup/plugin-replace'
import terser from 'rollup-plugin-terser'
import rollup from 'rollup'

import { SRC, DIST } from '../lib/dirs.js'
import wrap from '../lib/spinner.js'

async function repackScripts (assets) {
  let scripts = assets.get(/\.js$/).map(compiled => {
    let name
    if (compiled.endsWith('service.js')) {
      name = 'service.js'
    } else {
      name = compiled.replace(/^.+\W(\w+)\.\w+\.js$/, '$1.js')
    }
    return [join(SRC, name), compiled]
  })

  let toCache = assets
    .map(i => {
      return '/' + relative(DIST, i)
        .replace(/\\/g, '/')
        .replace(/\/index\.html$/, '/')
    })
    .filter(i => {
      return i !== '/service.js' &&
             i !== '/uikit/' &&
             i !== '/logo.svg' &&
             i !== '/logotype.svg' &&
             i !== '/favicon.ico' &&
             i !== '/robots.txt' &&
             !i.startsWith('/og.') &&
             !i.startsWith('/.well-known/')
    })

  await Promise.all(scripts.map(async ([input, output]) => {
    let plugins = [
      injectProcessEnv({ NODE_ENV: 'production' }),
      terser.terser()
    ]
    if (output.endsWith('service.js')) {
      plugins = [
        replace({ FILES: JSON.stringify(toCache) }),
        ...plugins
      ]
    }
    let bundle = await rollup.rollup({ input, plugins })
    let results = await bundle.generate({ format: 'iife' })
    await fs.writeFile(output, results.output[0].code)
  }))
}

export default wrap(repackScripts, 'Optimizing JS')
