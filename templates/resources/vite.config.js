import path from 'node:path'
import fs from 'node:fs'
import fg from 'fast-glob'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Resolves paths to the script and style packs directories, which contain the entry files for the build.
const scriptsDir = path.resolve(__dirname, 'src/scripts/packs')
const stylesDir = path.resolve(__dirname, 'src/styles/packs')

// Global Const
const STYLE_ENTRY_PREFIX = 'css_'
// Maximum number of characters in a single resource file before splitting it into parts.
const MAX_RESOURCE_CHARS = 131072

function toEntryKey(rootDir, absoluteFilePath) {
  const relativePath = path.relative(rootDir, absoluteFilePath)
  return relativePath.slice(0, -path.extname(relativePath).length)
}

function discoverScriptEntries() {
  const entries = {}
  for (const file of fg.sync('**/*.js', { cwd: scriptsDir, absolute: true })) {
    entries[toEntryKey(scriptsDir, file)] = file
  }
  return entries
}

function discoverStyleEntries() {
  const entries = {}
  for (const file of fg.sync('*.{scss,css}', { cwd: stylesDir, absolute: true })) {
    entries[STYLE_ENTRY_PREFIX + toEntryKey(stylesDir, file)] = file
  }
  return entries
}

function isStyleEntryName(entryName) {
  return entryName.startsWith(STYLE_ENTRY_PREFIX)
}

function withoutStyleEntryPrefix(entryName) {
  return entryName.slice(STYLE_ENTRY_PREFIX.length)
}

const scriptEntries = discoverScriptEntries()
const styleEntries = discoverStyleEntries()

if (Object.keys(scriptEntries).length === 0) {
  throw new Error(`No script entries found under ${scriptsDir} — check the glob pattern before building.`)
}

// Chunks large files into multiple parts, and wraps each entry chunk in an IIFE.
// It appends .partN to the file name of each part, they should be added as such 
// to the theme's resources.
function inlineChunksAndWrapIife() {
  return {
    name: 'inline-chunks-and-wrap-iife',
    generateBundle(_options, bundle) {
      const sharedChunks = {}
      const entryChunks = []

      for (const fileName in bundle) {
        const chunk = bundle[fileName]
        if (chunk.type !== 'chunk') continue
        if (chunk.isEntry) entryChunks.push({ fileName, chunk })
        else sharedChunks[fileName] = chunk
      }

      for (const { chunk } of entryChunks) {
        let code = chunk.code

        for (const [sharedFileName, sharedChunk] of Object.entries(sharedChunks)) {
          const isImported =
            (chunk.imports && chunk.imports.includes(sharedFileName)) ||
            (chunk.implicitlyLoadedBefore && chunk.implicitlyLoadedBefore.includes(sharedFileName))
          if (!isImported) continue

          const sharedCode = sharedChunk.code
            .replace(/export\s+default\s+/g, '') // "export default function foo" -> "function foo"
            .replace(/export\s*\{[^}]*\};?\s*/g, '') // "export { a, b };"
            .replace(/export\s+(function|class|const|let|var)\s+/g, '$1 ')

          const justFileName = sharedFileName.split('/').pop()
          const escapedFileName = justFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

          const importFromPattern = new RegExp(
            `import\\s+(?:[\\w$]+\\s*,\\s*)?(?:\\{[^}]*\\}|\\*\\s+as\\s+[\\w$]+|[\\w$]+)?\\s*from\\s*['"]\\.\\/` +
              escapedFileName +
              `['"];?\\s*`,
            'g'
          )
          const bareImportPattern = new RegExp(`import\\s*['"]\\.\\/` + escapedFileName + `['"];?\\s*`, 'g')

          code = code.replace(importFromPattern, '').replace(bareImportPattern, '')
          code = `${sharedCode}\n\n${code}`
        }

        // Safety net: strip any import statement that slipped through the per-file
        // patterns above (e.g. referencing a shared chunk by a path shape not covered).
        code = code.replace(/^\s*import\s+.*?from\s*['"][^'"]+['"];?\s*$/gm, '')
        code = code.replace(/^\s*import\s*['"][^'"]+['"];?\s*$/gm, '')

        chunk.code = `(() => {\n${code}\n})();`
      }

      for (const fileName of Object.keys(sharedChunks)) {
        delete bundle[fileName]
      }
    },
  }
}

// --- Manifest ---------------------------------------------------------------------

function splitIntoSafeParts(text, maxChars = MAX_RESOURCE_CHARS) {
  const parts = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length)

    if (end < text.length) {
      const lastCharCode = text.charCodeAt(end - 1)
      if (lastCharCode >= 0xd800 && lastCharCode <= 0xdbff) end -= 1 // don't split a surrogate pair
      while (end > start + 1 && (/\s/.test(text[end - 1]) || /\s/.test(text[end]))) end -= 1
    }

    parts.push(text.slice(start, end))
    start = end
  }

  return parts
}

function getOutputContent(output) {
  if (output.type === 'chunk') return output.code
  return typeof output.source === 'string' ? output.source : output.source.toString('utf-8')
}

/**
 * Anything over the limit is split into `dist/{baseName}.partN` files instead 
 * written as new assets.
 */
function addManifestEntry(pluginContext, bundle, manifest, manifestKey, output) {
  const content = getOutputContent(output)

  if (content.length <= MAX_RESOURCE_CHARS) {
    manifest[manifestKey] = `dist/${output.fileName}`
    return
  }

  manifest[manifestKey] = splitIntoSafeParts(content).map((part, index) => {
    const partFileName = `${output.fileName}.part${index}`
    pluginContext.emitFile({ type: 'asset', fileName: partFileName, source: part })
    return `dist/${partFileName}`
  })

  delete bundle[output.fileName]
}

/** Emits a manifest.json file mapping the original entry names to the final output file names, including any split parts.
 */
function manifestPlugin() {
  return {
    name: 'storeconnect-manifest',
    generateBundle(_options, bundle) {
      const manifest = {}

      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk' && output.isEntry && !isStyleEntryName(output.name)) {
          addManifestEntry(this, bundle, manifest, `dist/scripts/${output.name}.js`, output)
        } else if (output.type === 'asset' && output.fileName.endsWith('.css')) {
          const baseName = withoutStyleEntryPrefix(output.name.replace(/\.css$/, ''))
          addManifestEntry(this, bundle, manifest, `dist/styles/${baseName}.css`, output)
        }
      }

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2),
      })
    },
  }
}

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        // Important: Matches the legacy esbuild pipeline's sassPlugin loadPaths, so unprefixed
        // imports like `@import 'base/dependencies'` (relative to src/styles, not to
        // the importing file) keep resolving.
        loadPaths: [path.resolve(__dirname, 'src/styles'), path.resolve(__dirname, 'node_modules')],
        silenceDeprecations: ['import', 'if-function'],
      },
    },
    postcss: {
      plugins: [
        require('postcss-url')({ url: 'inline', basePath: 'src/files' }),
        require('postcss-nested')(),
        require('autoprefixer')(),
      ],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: false, // dist/manifest.json is emitted by manifestPlugin() above instead
    minify: process.argv.includes('--minify'),
    cssMinify: false,
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      input: { ...scriptEntries, ...styleEntries },
      output: {
        format: 'es', // required for a multi-entry build; inlineChunksAndWrapIife() above
        // removes every cross-file import so the final output has none left regardless.
        entryFileNames: 'scripts/[name].[hash].js',
        chunkFileNames: 'scripts/_chunks/[name].[hash].js', // deleted post-inlining; name doesn't matter
        assetFileNames: (asset) => {
          const name = asset.names?.[0] ?? asset.name ?? 'asset'
          if (name.endsWith('.css')) {
            const baseName = withoutStyleEntryPrefix(name.replace(/\.css$/, ''))
            return `styles/${baseName}.[hash].css`
          }
          return 'files/[name].[hash][extname]'
        },
      },
    },
  },
  plugins: [tailwindcss(), inlineChunksAndWrapIife(), manifestPlugin()],
})
