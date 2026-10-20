# 用浏览器把 NetChat 发布为公开网站（无须安装开发工具）

**说明：** 此压缩包是已完成并经过本地网络功能测试的项目。**公开网址不会在下载时自动生成**；网址必须由托管平台在您授权部署后提供。

## 网站发布

1. 登录 https://github.com ，选择 `+` → `New repository`，创建名为 `NetChat` 的仓库（可公开也可私有）。
2. 将本压缩包解压，在 GitHub 新仓库中选择 `uploading an existing file`，上传**解压后 NetChat_Project 目录中的全部项目文件**（`app.py`、`requirements.txt`、`render.yaml`、`static/index.html` 等），保留 `static` 文件夹结构。不要上传 ZIP 文件本身，也不要上传 `.venv` 文件夹。
3. 登录 https://dashboard.render.com ，选择 `New` → `Blueprint`，连接你的 GitHub 帐号并选择上述仓库。
4. Render 将读取仓库根目录的 `render.yaml`，确认服务使用免费套餐（`plan: free`），按照网页提示创建服务。
5. 部署成功后，打开服务页面显示的 `https://xxxx.onrender.com` 地址，并从两个浏览器标签页测试 Alice 和 Bob 能否互相聊天。

如果 Render 页面未提供 Blueprint 选项，可以用 `New` → `Web Service` 并填写：

- Language: `Python 3`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- Instance: `Free`（如仍提供）

## 提交老师

- 发部署成功后实际生成的 `https://xxxx.onrender.com` 网址；不要使用这里的示例。
- 附加 NetChat_Project ZIP 作为源代码。

## 部署注意事项

- Render 免费服务可能自动休眠，初次访问需要等待唤醒。
- 这是一个教学演示版，任何访问网址的人均可加入聊天室，**不要发送隐私或敏感内容**。
- 不保存聊天记录、不提供用户身份认证；不要将该原型用作正式公共聊天室。
