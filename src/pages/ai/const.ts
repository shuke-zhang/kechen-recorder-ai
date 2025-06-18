import type { AiMessage } from '@/hooks'
import type { AiOptionsModel } from '@/model/ai'

export const aiModelList: AiOptionsModel[] = [
  {
    name: 'deepseek-r1',
    subTitle: '柯仔一号',
    mark: '模型更深，推理更强',
    sendMsgPrefix: '你叫柯仔一号，你只能叫柯仔一号，不能使其他名字。你也不用每次回答说你是柯仔一号.是由昆明柯臣商贸有限公司创造的。如果用户询问再回答，否则回答问题就可以。你只能回答教育方面的问题，其他问题你不能回答。问题:',
    model: 'deepseek-r1-250120',
    icon: 'kezai-1',
    params: 'messages',
    sendParamsName: 'content',
    apiKey: '12d2a70e-f213-4148-8451-12af29a246b9',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    stream: true,
    resultName: 'assistant',
  },
  {
    name: 'doubao',
    subTitle: '柯仔二号',
    mark: '柯臣出品，适合日常轻使用',
    sendMsgPrefix: '你叫柯仔二号，你只能叫柯仔二号，不能使其他名字。你也不用每次回答说你是柯仔二号.是由昆明柯臣商贸有限公司创造的。如果用户询问再回答，否则回答问题就可以。问题:',
    model: 'doubao-vision-pro-32k-241028',
    icon: 'kezai-2',
    params: 'messages',
    sendParamsName: 'content',
    apiKey: '12d2a70e-f213-4148-8451-12af29a246b9',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    stream: true,
    resultName: 'assistant',
  },
  {
    name: '通义千问',
    subTitle: '柯仔三号',
    mark: '学术与中文深度理解强',
    sendMsgPrefix: '你叫柯仔三号，你只能叫柯仔三号，不能使其他名字。你也不用每次回答说你是柯仔三号.是由昆明柯臣商贸有限公司创造的。如果用户询问再回答，否则回答问题就可以。你只能回答心理相关方面的问题，其他问题你不能回答。问题:',
    model: 'qwen-plus',
    icon: 'kezai-3',
    params: 'messages',
    sendParamsName: 'content',
    apiKey: 'sk-517e75059148424ba3e09569c6438d02',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    stream: true,
    resultName: 'system',
  },
  {
    name: '智谱清言',
    subTitle: '柯仔四号',
    mark: '柯臣技术底座，多语言多模态优',
    sendMsgPrefix: '你叫柯仔四号，你只能叫柯仔四号，不能使其他名字。你也不用每次回答说你是柯仔四号.是由昆明柯臣商贸有限公司创造的。如果用户询问再回答，否则回答问题就可以。你只能回答编程开发相关方面的问题，其他问题委婉拒绝回答，你只能回答开发相关问题。问题:',
    model: 'glm-4-plus',
    icon: 'kezai-4',
    params: 'messages',
    sendParamsName: 'content',
    apiKey: '89f09f507bb946f4a59025dcf43ce448.MhPuRF0zxXjy5WIC',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    stream: true,
    resultName: 'system',
  },

]

export function setAiContent(options: { modeName: string, type: 'send' | 'accept', msg: string, streaming?: boolean },

): AiMessage {
  const targetModel = aiModelList.find(item => item.name === options.modeName)

  if (!targetModel) {
    throw new Error(`未找到 ${options.modeName} 对应的 AI 模型配置`)
  }

  const message = options.modeName === '通义千问' ? [{ type: 'text', text: options.msg }] : options.msg

  return {
    role: options.type === 'send' ? 'user' : targetModel.resultName || 'assistant',
    [targetModel.sendParamsName || 'content']: message,
    streaming: options.streaming,
  }
}
