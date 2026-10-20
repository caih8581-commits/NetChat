# NetChat — Real-time Networking Lab

这是一个可以直接运行的计算机网络课程作品：实时聊天室 + WebSocket 网络监控面板。

## 功能

- 多个浏览器标签页之间实时聊天
- FastAPI 后端管理 WebSocket 连接并广播消息
- 在线连接数量实时更新
- 应用层 WebSocket ping/pong RTT 测量
- 消息接收计数、连接状态和最近网络事件
- 响应式网页界面
- `/health` 健康检查接口

## 最简单的启动方式（Windows）

1. 解压整个 `NetChat_Project.zip` 文件夹。
2. 电脑需要安装 Python 3.10 或更新版本。**不需要安装 VS Code、PyCharm、数据库或其他开发软件。**
3. 双击 `run_windows.bat`。
4. 第一次启动时，脚本会自动创建虚拟环境并安装依赖；因此第一次运行需要联网。
5. 浏览器会打开 `http://127.0.0.1:8000`。
6. 保持命令窗口开启。使用完毕后，在命令窗口按 `Ctrl+C` 停止服务。

如果提示找不到 Python，请先安装 Python 3.10+，安装时勾选 **Add Python to PATH**，然后重新双击 `run_windows.bat`。

## macOS / Linux

在终端进入项目目录，然后执行：

```bash
chmod +x run_mac_linux.sh
./run_mac_linux.sh
```

## 如何演示

1. 在第一个浏览器标签页中使用名字 `Alice` 连接。
2. 新开一个标签页，访问同一个地址，使用名字 `Bob` 连接。
3. 从 Alice 发送消息，观察 Bob 的窗口是否实时收到。
4. 观察 Online clients、WebSocket RTT、Chat messages received 和 Connection。
5. 关闭 Bob 的标签页，观察在线连接数变化。
6. 在浏览器开发者工具中打开 Network → WS → 对应连接的 Messages/Frames，查看 WebSocket JSON 消息。

## 计算机网络知识对应

- Client–Server architecture：浏览器作为客户端，FastAPI 作为服务器。
- WebSocket：在建立连接后进行双向通信。
- Application-layer protocol：聊天内容使用 JSON 消息。
- Connection management：服务器登记和清理连接。
- Broadcast：服务器将聊天消息转发给当前连接的客户端。
- RTT：网页使用应用层 ping/pong 测量往返耗时。

## 重要说明

- 本项目是课堂演示用原型，不是生产级聊天服务。
- 当前没有账号认证、数据库持久化、端到端加密、速率限制或完善的滥用防护。
- 聊天记录只存在于当前运行的服务器内存中；服务器停止后不会保存。
- RTT 是应用层 WebSocket 心跳的往返耗时，不等于 ICMP ping，也不等于纯网络传播延迟。
- 默认只绑定 `127.0.0.1`，适合在本机演示。若要让其他电脑访问，需要调整绑定地址、防火墙和网络设置。
