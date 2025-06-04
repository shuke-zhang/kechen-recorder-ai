type BaseResponse = string | object | ArrayBuffer
export interface UniAppResponse<T extends BaseResponse = BaseResponse> extends UniApp.RequestSuccessCallbackResult {
  data: T
}
export interface versionModel {
  version: string
  appUrl: string
}
