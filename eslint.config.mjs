import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  vue: true,
  rules: {
    'no-unused-vars': 'off',
    'unused-imports/no-unused-vars': 'off',
    'no-undef': 'off',
    'no-console': 'off',
    'ts/no-unused-expressions': 'off',
    'vue/custom-event-name-casing': 'off',
  },
})
