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
        return isOnlyEmoji(textWithPunctuation) ? '' : textWithPunctuation
      }
      return ''
    }
    else {
      const results: string[] = []
      let start = 0
      for (let i = 0; i < fullText.length; i++) {
        if (punctuationMarks.includes(fullText[i])) {
          const segment = fullText.substring(start, i + 1)
          if (!isOnlyEmoji(segment)) {
            results.push(segment)
          }
          start = i + 1
        }
      }
      if (start < fullText.length) {
        const segment = fullText.substring(start)
        if (!isOnlyEmoji(segment)) {
          results.push(segment)
        }
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

  function isOnlyEmoji(text: string): boolean {
    // 将字符串转换成 unicode 码点数组
    const codePoints = [...text]
    return codePoints.every((char) => {
      const code = char.codePointAt(0) || 0
      return (
        // 常见 emoji 范围（可根据需要扩展）
        (code >= 0x1F600 && code <= 0x1F64F) // Emoticons
        || (code >= 0x1F300 && code <= 0x1F5FF) // Misc Symbols and Pictographs
        || (code >= 0x1F680 && code <= 0x1F6FF) // Transport and Map
        || (code >= 0x2600 && code <= 0x26FF) // Misc symbols
        || (code >= 0x2700 && code <= 0x27BF) // Dingbats
        || (code >= 0xFE00 && code <= 0xFE0F) // Variation Selectors
        || (code >= 0x1F900 && code <= 0x1F9FF) // Supplemental Symbols and Pictographs
        || (code >= 0x1FA70 && code <= 0x1FAFF) // Symbols and Pictographs Extended-A
      )
    })
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
