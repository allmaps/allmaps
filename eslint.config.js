import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores, includeIgnoreFile } from 'eslint/config'
import globals from 'globals'
import path from 'node:path'
import ts from 'typescript-eslint'

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore')

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  globalIgnores(['**/*.tsx']),
  js.configs.recommended,
  ts.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'no-unused-private-class-members': 'off'
    }
  },
  {
    files: ['**/test/**/*.{js,ts}', '**/*.test.{js,ts}'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  }
)
