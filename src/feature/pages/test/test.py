import asyncio  # 引入异步IO库，用于实现异步编程
import json  # 用于处理JSON数据
import uuid  # 生成唯一标识符，用于session ID等

import aiofiles  # 异步文件读写库
import websocket  # 保留未使用的库，可删除
import websockets  # 异步WebSocket库，用于连接TTS服务
from websockets.asyncio.client import ClientConnection  # 用于类型注解

# 定义协议头的参数
PROTOCOL_VERSION = 0b0001  # 协议版本
DEFAULT_HEADER_SIZE = 0b0001  # 头部大小（单位：4字节）

# 消息类型（Message Type）
FULL_CLIENT_REQUEST = 0b0001  # 客户端完整请求
AUDIO_ONLY_RESPONSE = 0b1011  # 仅音频响应
FULL_SERVER_RESPONSE = 0b1001  # 服务端完整响应
ERROR_INFORMATION = 0b1111  # 错误信息

# 消息类型标志位（Message Type Specific Flags）
MsgTypeFlagNoSeq = 0b0000  # 非终止数据包，无序列号
MsgTypeFlagPositiveSeq = 0b1  # 非终止数据包，有序列号
MsgTypeFlagLastNoSeq = 0b10  # 终止包，无序列号
MsgTypeFlagNegativeSeq = 0b11  # 包含事件号的负序号包
MsgTypeFlagWithEvent = 0b100  # 包含事件类型

# 序列化方法
NO_SERIALIZATION = 0b0000
JSON = 0b0001

# 压缩方法
COMPRESSION_NO = 0b0000
COMPRESSION_GZIP = 0b0001

# 定义各种事件（上下行事件）
EVENT_NONE = 0
EVENT_Start_Connection = 1
EVENT_FinishConnection = 2
EVENT_ConnectionStarted = 50
EVENT_ConnectionFailed = 51
EVENT_ConnectionFinished = 52
EVENT_StartSession = 100
EVENT_FinishSession = 102
EVENT_SessionStarted = 150
EVENT_SessionFinished = 152
EVENT_SessionFailed = 153
EVENT_TaskRequest = 200
EVENT_TTSSentenceStart = 350
EVENT_TTSSentenceEnd = 351
EVENT_TTSResponse = 352

# Header类用于构造头部协议
class Header:
    def __init__(self,
                 protocol_version=PROTOCOL_VERSION,
                 header_size=DEFAULT_HEADER_SIZE,
                 message_type: int = 0,
                 message_type_specific_flags: int = 0,
                 serial_method: int = NO_SERIALIZATION,
                 compression_type: int = COMPRESSION_NO,
                 reserved_data=0):
        self.header_size = header_size
        self.protocol_version = protocol_version
        self.message_type = message_type
        self.message_type_specific_flags = message_type_specific_flags
        self.serial_method = serial_method
        self.compression_type = compression_type
        self.reserved_data = reserved_data

    def as_bytes(self) -> bytes:
        # 将头部信息序列化成字节数组（总共4字节）
        return bytes([
            (self.protocol_version << 4) | self.header_size,  # 高4位协议版本，低4位头部长度
            (self.message_type << 4) | self.message_type_specific_flags,  # 高4位消息类型，低4位标志位
            (self.serial_method << 4) | self.compression_type,  # 高4位序列化方式，低4位压缩方式
            self.reserved_data  # 保留字段
        ])

# Optional类用于构造可选字段（事件、sessionId等）
class Optional:
    def __init__(self, event: int = EVENT_NONE, sessionId: str = None, sequence: int = None):
        self.event = event
        self.sessionId = sessionId
        self.errorCode: int = 0  # 默认错误码为0
        self.connectionId: str | None = None
        self.response_meta_json: str | None = None
        self.sequence = sequence

    def as_bytes(self) -> bytes:
        option_bytes = bytearray()
        if self.event != EVENT_NONE:
            option_bytes.extend(self.event.to_bytes(4, "big", signed=True))  # 添加事件号
        if self.sessionId is not None:
            session_id_bytes = str.encode(self.sessionId)  # 转为字节
            size = len(session_id_bytes).to_bytes(4, "big", signed=True)  # 添加长度
            option_bytes.extend(size)
            option_bytes.extend(session_id_bytes)
        if self.sequence is not None:
            option_bytes.extend(self.sequence.to_bytes(4, "big", signed=True))  # 添加序列号
        return option_bytes

# 响应类，用于解析服务端返回数据
class Response:
    def __init__(self, header: Header, optional: Optional):
        self.optional = optional
        self.header = header
        self.payload: bytes | None = None
        self.payload_json: str | None = None

    def __str__(self):
        return super().__str__()

# 发送事件到WebSocket连接
async def send_event(ws: websocket, header: bytes, optional: bytes | None = None, payload: bytes = None):
    full_client_request = bytearray(header)  # 将头部字节加入请求
    if optional is not None:
        full_client_request.extend(optional)  # 添加可选字段
    if payload is not None:
        payload_size = len(payload).to_bytes(4, 'big', signed=True)  # 添加payload长度（4字节）
        full_client_request.extend(payload_size)
        full_client_request.extend(payload)  # 添加payload数据内容
    await ws.send(full_client_request)  # 异步发送完整数据包到WebSocket连接
