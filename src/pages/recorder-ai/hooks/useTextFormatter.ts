const punctuationMarks = ['，', '。', '！', '；', '？']

function containsPunctuation(text: string) {
  for (let i = 0; i < text.length; i++) {
    if (punctuationMarks.includes(text[i])) {
      return { hasPunctuation: true, index: i, punctuation: text[i] }
    }
  }
  return { hasPunctuation: false, index: -1, punctuation: '' }
}

export function useTextFormatter() {
  const buffer = ref('')
  const lastProcessedText = ref('')

  // 函数重载区
  function processText(fullText: string, isFullText: true): string[]
  function processText(fullText: string, isFullText?: false): string
  // 实现体
  function processText(fullText: string, isFullText: boolean = false): string | string[] {
    if (!isFullText) {
      let incrementalText = ''
      if (
        fullText.length > lastProcessedText.value.length
        && fullText.startsWith(lastProcessedText.value)
      ) {
        incrementalText = fullText.substring(lastProcessedText.value.length)
      }
      else if (fullText !== lastProcessedText.value) {
        buffer.value = ''
        incrementalText = fullText
      }
      else {
        return ''
      }

      lastProcessedText.value = fullText
      buffer.value += incrementalText

      const punctuationInfo = containsPunctuation(buffer.value)
      if (punctuationInfo.hasPunctuation) {
        const textWithPunctuation = buffer.value.substring(0, punctuationInfo.index + 1)
        buffer.value = buffer.value.substring(punctuationInfo.index + 1)
        return textWithPunctuation
      }
      return ''
    }
    else {
      const results: string[] = []
      let start = 0
      for (let i = 0; i < fullText.length; i++) {
        if (punctuationMarks.includes(fullText[i])) {
          results.push(fullText.substring(start, i + 1))
          start = i + 1
        }
      }
      if (start < fullText.length) {
        results.push(fullText.substring(start))
      }
      buffer.value = ''
      lastProcessedText.value = fullText
      return results
    }
  }

  function flush(): string[] {
    const results: string[] = []
    if (buffer.value.trim()) {
      results.push(buffer.value)
      buffer.value = ''
    }
    return results
  }

  function textReset() {
    buffer.value = ''
    lastProcessedText.value = ''
  }

  function getBuffer() {
    return buffer.value
  }

  return {
    processText,
    flush,
    textReset,
    getBuffer,
    buffer,
    lastProcessedText,
  }
}
