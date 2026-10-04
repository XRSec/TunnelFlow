// Generated from SSHDirectiveCatalog.swift - 100% OpenSSH Directive parity

export interface SSHDirectiveInfo {
  key: string;
  nameLocalized: string;
  defaultValue: string;
  group: string;
  groupLocalized: string;
  type: 'choice' | 'string' | 'integer' | 'boolean';
  candidates: string[];
  helpText: string;
}

export interface SSHDirectiveGroup {
  id: string;
  name: string;
  nameLocalized: string;
  options: SSHDirectiveInfo[];
}

export const SSH_DIRECTIVE_GROUPS: SSHDirectiveGroup[] = [
  {
    "id": "Basic",
    "name": "Basic",
    "nameLocalized": "基本",
    "options": [
      {
        "key": "AddressFamily",
        "nameLocalized": "地址族",
        "defaultValue": "any",
        "group": "Basic",
        "groupLocalized": "基本",
        "type": "choice",
        "candidates": [
          "any",
          "inet",
          "inet6"
        ],
        "helpText": "指定连接时使用的 IP 地址族类型。可选值：any（默认值，允许 IPv4 或 IPv6）、inet（仅使用 IPv4）、inet6（仅使用 IPv6）。"
      },
      {
        "key": "BindAddress",
        "nameLocalized": "监听地址",
        "defaultValue": "default",
        "group": "Basic",
        "groupLocalized": "基本",
        "type": "string",
        "candidates": [],
        "helpText": "指定本地机器绑定的源 IP 地址作为连接的出口地址。常用于拥有多个网卡或多个 IP 地址的机器，以指定特定的出口流量网络。"
      },
      {
        "key": "BindInterface",
        "nameLocalized": "绑定网络接口",
        "defaultValue": "default",
        "group": "Basic",
        "groupLocalized": "基本",
        "type": "string",
        "candidates": [],
        "helpText": "指定本地机器绑定的网络接口名称（如 en0、eth0）作为连接的源出口。仅在系统支持且具备多网络接口时使用。"
      },
      {
        "key": "Compression",
        "nameLocalized": "数据压缩",
        "defaultValue": "no",
        "group": "Basic",
        "groupLocalized": "基本",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定是否对传输的会话数据启用压缩。可选参数为 yes（开启压缩）或 no（默认值，不压缩）。在慢速或受限网络中可提升吞吐量，但在高速局域网下可能增加 CPU 负载。"
      },
      {
        "key": "EscapeChar",
        "nameLocalized": "转义字符",
        "defaultValue": "~",
        "group": "Basic",
        "groupLocalized": "基本",
        "type": "string",
        "candidates": [],
        "helpText": "设置终端转义字符（默认值：‘~’）。也可以通过命令行参数指定。参数可为单个字符、以‘^’后跟字母表示的控制字符，或设为 none 以完全禁用转义字符（适合透明传输二进制数据）。"
      },
      {
        "key": "EnableEscapeCommandline",
        "nameLocalized": "启用转义命令行",
        "defaultValue": "no",
        "group": "Basic",
        "groupLocalized": "基本",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "设置在使用转义字符（如 ~C）时，是否允许打开命令行交互提示符以动态增减端口转发。可选值为 yes 或 no（默认值：no）。"
      },
      {
        "key": "IPQoS",
        "nameLocalized": "服务质量",
        "defaultValue": "af21 cs1",
        "group": "Basic",
        "groupLocalized": "基本",
        "type": "string",
        "candidates": [],
        "helpText": "指定 SSH 流量的 IP 服务质量 (QoS) 或区分服务代码点 (DSCP)。可设置为单个关键字或以空格分隔的交互/批量模式组合，例如 lowdelay、throughput、reliability、af11~af44、cs0~cs7 等，默认通常为 af21 cs1。"
      },
      {
        "key": "LogVerbose",
        "nameLocalized": "详细日志配置",
        "defaultValue": "none",
        "group": "Basic",
        "groupLocalized": "基本",
        "type": "string",
        "candidates": [],
        "helpText": "开启更详细的特定子系统或代码模块日志记录。可配置为模块名、函数名或文件名的模式匹配规则，以空格分隔。"
      },
      {
        "key": "SendEnv",
        "nameLocalized": "发送环境变量",
        "defaultValue": "none",
        "group": "Basic",
        "groupLocalized": "基本",
        "type": "string",
        "candidates": [],
        "helpText": "指定将客户端本地的环境变量发送并导出到远程服务器会话中。变量名支持通配符（如 LANG, LC_*）。注意：远程服务器端 sshd_config 也必须通过 AcceptEnv 明确允许接收相应变量。"
      },
      {
        "key": "SetEnv",
        "nameLocalized": "设置环境变量",
        "defaultValue": "none",
        "group": "Basic",
        "groupLocalized": "基本",
        "type": "string",
        "candidates": [],
        "helpText": "直接在建立会话时向远程服务器设置环境变量，格式为 NAME=VALUE。远程服务器 sshd 必须允许客户端设置环境变量。"
      }
    ]
  },
  {
    "id": "Activity",
    "name": "Activity",
    "nameLocalized": "活动",
    "options": [
      {
        "key": "ChannelTimeout",
        "nameLocalized": "通道超时",
        "defaultValue": "none",
        "group": "Activity",
        "groupLocalized": "活动",
        "type": "string",
        "candidates": [],
        "helpText": "为各类空闲通道设置连接超时，超时后通道将自动关闭。语法格式形如 type=interval，其中 type 可为 session、x11、agent-forwarding 等，interval 为秒数或带时间单位的字符串。"
      },
      {
        "key": "ConnectTimeout",
        "nameLocalized": "连接超时",
        "defaultValue": "none",
        "group": "Activity",
        "groupLocalized": "活动",
        "type": "integer",
        "candidates": [],
        "helpText": "设置连接 SSH 服务器时的 TCP 握手和初始握手超时时间（单位：秒）。如果超时仍未能连接，ssh 客户端将终止尝试，而不是等待操作系统的漫长默认网络超时。"
      },
      {
        "key": "ObscureKeystrokeTiming",
        "nameLocalized": "击键时序混淆",
        "defaultValue": "interval:20",
        "group": "Activity",
        "groupLocalized": "活动",
        "type": "string",
        "candidates": [],
        "helpText": "指定是否通过固定间隔发送伪造数据包来混淆按键敲击时间特征，以防止网络侧嗅探通过击键时延分析密码或输入内容。可设为 yes、no 或具体间隔毫秒数（默认：yes）。"
      },
      {
        "key": "RekeyLimit",
        "nameLocalized": "重新协商密钥阈值",
        "defaultValue": "default none",
        "group": "Activity",
        "groupLocalized": "活动",
        "type": "string",
        "candidates": [],
        "helpText": "指定会话密钥重新协商（Rekey）的数据量上限或时间上限。格式形如 1G 1h（每传输 1GB 数据或每经过 1 小时重新协商一次密钥）。默认会根据密码套件自动设置合理上限。"
      },
      {
        "key": "ServerAliveCountMax",
        "nameLocalized": "心跳保活重试次数",
        "defaultValue": "3",
        "group": "Activity",
        "groupLocalized": "活动",
        "type": "integer",
        "candidates": [],
        "helpText": "设置客户端在未收到服务器任何响应的情况下，允许发送心跳探测包的最大重试次数。超过此阈值客户端将主动断开连接。默认值为 3。常与 ServerAliveInterval 配合使用保持长连接不断开。"
      },
      {
        "key": "ServerAliveInterval",
        "nameLocalized": "心跳保活间隔",
        "defaultValue": "0",
        "group": "Activity",
        "groupLocalized": "活动",
        "type": "integer",
        "candidates": [],
        "helpText": "设置客户端向服务器发送保活心跳包的时间间隔（单位：秒）。默认值为 0（表示不发送）。例如设置为 30 或 60，可在长时间无操作时保持 NAT 映射和防火墙连接活跃，防止连接假死。"
      },
      {
        "key": "TCPKeepAlive",
        "nameLocalized": "TCP 保活",
        "defaultValue": "yes",
        "group": "Activity",
        "groupLocalized": "活动",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定是否向对方发送操作系统底层的 TCP 保活探测消息。可选值为 yes（默认值）或 no。开启有助于检测网络断开或远程主机宕机，但在经过 NAT 路由且网络短暂闪断时可能导致连接被过早断开。"
      }
    ]
  },
  {
    "id": "Forwarding",
    "name": "Forwarding",
    "nameLocalized": "转发",
    "options": [
      {
        "key": "ExitOnForwardFailure",
        "nameLocalized": "转发失败则断开",
        "defaultValue": "no",
        "group": "Forwarding",
        "groupLocalized": "转发",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定在动态、本地或远程端口转发配置失败（例如端口已被占用）时，ssh 是否直接退出连接并报错。可选参数为 yes 或 no（默认值：no）。对于专注做端口转发的隧道工具，建议开启以快速感知错误。"
      },
      {
        "key": "ForwardX11",
        "nameLocalized": "转发 X11",
        "defaultValue": "no",
        "group": "Forwarding",
        "groupLocalized": "转发",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定是否通过安全 SSH 隧道自动转发 X11 图形界面连接并设置远程 DISPLAY 环境变量。可选参数为 yes 或 no（默认值：no）。"
      },
      {
        "key": "ForwardX11Timeout",
        "nameLocalized": "X11 转发超时",
        "defaultValue": "20m",
        "group": "Forwarding",
        "groupLocalized": "转发",
        "type": "string",
        "candidates": [],
        "helpText": "指定 untrusted（非受信任）X11 转发连接的授权有效期。过期后拒绝新建 X11 连接。默认值通常为 1200 秒（20 分钟）。"
      },
      {
        "key": "ForwardX11Trusted",
        "nameLocalized": "信任 X11 转发",
        "defaultValue": "no",
        "group": "Forwarding",
        "groupLocalized": "转发",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定远程 X11 客户端是否具备完全信任权限。若设为 yes（默认），远程 X11 客户端对原始 X11 显示拥有完全访问控制；若设为 no，则施加安全扩展限制以防止按键窃听或截屏。"
      },
      {
        "key": "GatewayPorts",
        "nameLocalized": "网关端口",
        "defaultValue": "no",
        "group": "Forwarding",
        "groupLocalized": "转发",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定远程端口转发（-R）时是否允许非本地回环地址（如局域网或其他远程主机）连接到所分配的端口。可选值包括 no（仅限回环）、yes（强制绑定到所有接口 0.0.0.0）或 clientspecified（由客户端转发规则指定绑定 IP）。"
      },
      {
        "key": "PermitRemoteOpen",
        "nameLocalized": "允许远程端口开放目标",
        "defaultValue": "any",
        "group": "Forwarding",
        "groupLocalized": "转发",
        "type": "string",
        "candidates": [],
        "helpText": "限制通过远程端发起的端口转发（如 OpenSSH 动态/远程代理中）允许连接的目的地主机和端口。支持以空格分隔的 host:port 模式列表。"
      },
      {
        "key": "StreamLocalBindMask",
        "nameLocalized": "套接字掩码",
        "defaultValue": "0177",
        "group": "Forwarding",
        "groupLocalized": "转发",
        "type": "string",
        "candidates": [],
        "helpText": "指定通过 Unix 域套接字进行端口转发时，创建的本地套接字文件的八进制文件权限掩码（umask）。默认值为 0177（仅属主可读写）。"
      },
      {
        "key": "StreamLocalBindUnlink",
        "nameLocalized": "套接字解绑覆盖",
        "defaultValue": "no",
        "group": "Forwarding",
        "groupLocalized": "转发",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定在创建 Unix 域套接字端口转发时，如果目标路径上已存在同名的套接字文件，是否自动将其删除（unlink）。可选参数为 yes 或 no（默认值：no）。"
      },
      {
        "key": "XAuthLocation",
        "nameLocalized": "xauth 程序路径",
        "defaultValue": "/usr/X11R6/bin/xauth",
        "group": "Forwarding",
        "groupLocalized": "转发",
        "type": "string",
        "candidates": [],
        "helpText": "指定本地 xauth 可执行程序的绝对路径，用于处理 X11 转发的身份验证凭据生成。默认为系统的 xauth 路径。"
      }
    ]
  },
  {
    "id": "Proxy",
    "name": "Proxy",
    "nameLocalized": "代理",
    "options": [
      {
        "key": "ProxyCommand",
        "nameLocalized": "代理命令",
        "defaultValue": "none",
        "group": "Proxy",
        "groupLocalized": "代理",
        "type": "string",
        "candidates": [],
        "helpText": "指定连接服务器时使用的代理执行命令。ssh 将通过标准输入输出与其通信，命令中可使用 %h（目标主机）、%p（端口）等展开变量。例如使用 nc 或 ncat 实现跳板中转。"
      },
      {
        "key": "ProxyJump",
        "nameLocalized": "跳板机",
        "defaultValue": "none",
        "group": "Proxy",
        "groupLocalized": "代理",
        "type": "string",
        "candidates": [],
        "helpText": "指定连接目标主机所需经过的一台或多台跳板机（堡垒机）。多个跳板机以逗号分隔，格式形如 [user@]host[:port]。内部自动建立一系列 ssh 管道跳转，比 ProxyCommand 更简洁安全。"
      },
      {
        "key": "ProxyUseFdpass",
        "nameLocalized": "代理传递文件描述符",
        "defaultValue": "no",
        "group": "Proxy",
        "groupLocalized": "代理",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定跳板代理命令是否通过文件描述符传递（file descriptor passing）直接将已建立的套接字传给 ssh，而不是通过管道转发。可选参数为 yes 或 no（默认：no）。"
      }
    ]
  },
  {
    "id": "Known Hosts",
    "name": "Known Hosts",
    "nameLocalized": "已知主机",
    "options": [
      {
        "key": "CheckHostIP",
        "nameLocalized": "检查主机 IP",
        "defaultValue": "no",
        "group": "Known Hosts",
        "groupLocalized": "已知主机",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定在严格主机密钥验证时，是否同时检查 known_hosts 文件中主机的 IP 地址与公钥对应关系。设为 yes 可防止因 DNS 欺骗导致连接到被劫持主机；设为 no 则只校验主机名（默认：yes）。"
      },
      {
        "key": "KnownHostsCommand",
        "nameLocalized": "已知主机命令",
        "defaultValue": "none",
        "group": "Known Hosts",
        "groupLocalized": "已知主机",
        "type": "string",
        "candidates": [],
        "helpText": "指定一个本地命令，用于动态获取已知主机公钥列表，取代或补充静态的 known_hosts 文件。"
      },
      {
        "key": "FingerprintHash",
        "nameLocalized": "指纹散列算法",
        "defaultValue": "sha256",
        "group": "Known Hosts",
        "groupLocalized": "已知主机",
        "type": "choice",
        "candidates": [
          "md5",
          "sha256"
        ],
        "helpText": "指定显示服务器主机公钥指纹时使用的哈希算法。可选值为 sha256（默认值）或 md5。"
      },
      {
        "key": "HashKnownHosts",
        "nameLocalized": "哈希已知主机",
        "defaultValue": "no",
        "group": "Known Hosts",
        "groupLocalized": "已知主机",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定将新主机密钥写入 ~/.ssh/known_hosts 文件时，是否对主机名和 IP 进行不可逆的哈希混淆。开启后可防止文件泄露时暴露访问过的服务器主机名列表。可选参数为 yes 或 no。"
      },
      {
        "key": "HostKeyAlias",
        "nameLocalized": "主机密钥别名",
        "defaultValue": "none",
        "group": "Known Hosts",
        "groupLocalized": "已知主机",
        "type": "string",
        "candidates": [],
        "helpText": "指定在 known_hosts 数据库中查找或保存主机密钥时替代真实主机名使用的别名。适合多台机器具有相同别名或同一台机器在不同端口运行多个独立服务的情况。"
      },
      {
        "key": "StrictHostKeyChecking",
        "nameLocalized": "严格主机公钥检查",
        "defaultValue": "ask",
        "group": "Known Hosts",
        "groupLocalized": "已知主机",
        "type": "choice",
        "candidates": [
          "accept-new",
          "yes",
          "no",
          "ask",
          "off"
        ],
        "helpText": "设置对服务器主机公钥的严格检查策略。可选值包括：yes（严格比对，未知主机直接拒绝连接）、accept-new（仅接受首次连接的新主机密钥并保存，旧密钥改变时拒绝）、no（不校验，自动添加新密钥，不推荐用于生产）、ask（默认值，首次连接时交互式询问用户是否信任）。"
      },
      {
        "key": "UpdateHostKeys",
        "nameLocalized": "自动更新主机公钥",
        "defaultValue": "ask",
        "group": "Known Hosts",
        "groupLocalized": "已知主机",
        "type": "choice",
        "candidates": [
          "yes",
          "no",
          "ask"
        ],
        "helpText": "指定是否在连接成功后，自动根据服务器通告的更新列表学习并同步新的主机密钥。可选参数为 yes、no 或 ask。"
      },
      {
        "key": "UserKnownHostsFile",
        "nameLocalized": "用户已知主机文件",
        "defaultValue": "~/.ssh/known_hosts",
        "group": "Known Hosts",
        "groupLocalized": "已知主机",
        "type": "string",
        "candidates": [],
        "helpText": "指定保存用户已知主机公钥的文件路径。默认为 ~/.ssh/known_hosts。可指定多个空格分隔的路径。"
      },
      {
        "key": "VerifyHostKeyDNS",
        "nameLocalized": "DNS 验证主机公钥",
        "defaultValue": "no",
        "group": "Known Hosts",
        "groupLocalized": "已知主机",
        "type": "choice",
        "candidates": [
          "yes",
          "no",
          "ask"
        ],
        "helpText": "指定是否通过 DNS 的 SSHFP 记录自动校验服务器主机密钥的指纹。可选值包括 yes、no（默认）、ask。"
      },
      {
        "key": "VisualHostKey",
        "nameLocalized": "图形化主机指纹",
        "defaultValue": "no",
        "group": "Known Hosts",
        "groupLocalized": "已知主机",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定在连接验证时是否以 ASCII 艺术图像（指纹矩阵）形式展示服务器公钥的指纹，方便人类肉眼快速辨识。可选参数为 yes 或 no（默认：no）。"
      }
    ]
  },
  {
    "id": "Authentication",
    "name": "Authentication",
    "nameLocalized": "认证",
    "options": [
      {
        "key": "AddKeysToAgent",
        "nameLocalized": "添加密钥至代理",
        "defaultValue": "no",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "choice",
        "candidates": [
          "yes",
          "confirm",
          "ask",
          "no"
        ],
        "helpText": "指定在使用密码解锁私钥后，是否自动将该私钥加载到正在运行的 ssh-agent 认证代理中。可选值：yes（永久保留）、no（默认，不自动添加）、ask（添加并在每次使用前询问确认）或具体过期时间（如 1h）。"
      },
      {
        "key": "CertificateFile",
        "nameLocalized": "证书文件",
        "defaultValue": "none",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "string",
        "candidates": [],
        "helpText": "指定用于身份验证的 SSH 证书文件路径。通常配合对应的私钥 IdentityFile 一起使用。"
      },
      {
        "key": "EnableSSHKeysign",
        "nameLocalized": "启用 keysign 助手",
        "defaultValue": "no",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定在使用基于主机的身份验证（HostbasedAuthentication）时，是否允许调用辅助程序 ssh-keysign 生成签名。可选参数为 yes 或 no（默认：no）。"
      },
      {
        "key": "ForwardAgent",
        "nameLocalized": "转发认证代理",
        "defaultValue": "no",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定是否将本地运行的 ssh-agent 认证代理连接转发到远程服务器。可选参数为 yes 或 no（默认：no）。警告：仅在充分信任的远程主机上开启，否则具有超级用户权限的人员可能利用转发的套接字发起认证。"
      },
      {
        "key": "GSSAPIAuthentication",
        "nameLocalized": "GSSAPI 认证",
        "defaultValue": "no",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定是否启用基于 GSSAPI（如 Kerberos v5）的身份验证方式。可选参数为 yes 或 no（默认值：no）。常用于企业级单点登录网络环境中。"
      },
      {
        "key": "GSSAPIDelegateCredentials",
        "nameLocalized": "委派 GSSAPI 凭据",
        "defaultValue": "no",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定是否将本地的 GSSAPI / Kerberos 凭据自动委派（传递）给远程服务器。可选参数为 yes 或 no（默认：no）。"
      },
      {
        "key": "HostbasedAuthentication",
        "nameLocalized": "基于主机的认证",
        "defaultValue": "no",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定是否尝试基于主机的身份验证（通过本地机器主机密钥向服务器证明身份）。可选参数为 yes 或 no（默认值：no）。"
      },
      {
        "key": "IdentitiesOnly",
        "nameLocalized": "仅使用指定密钥",
        "defaultValue": "no",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定是否仅使用配置文件或命令行中显式指定的认证私钥，而忽略 ssh-agent 中缓存的其他非匹配密钥。在 agent 中载入较多密钥且服务器有认证尝试次数上限（避免 Too many authentication failures 错误）时非常有效。可选参数为 yes 或 no（默认值：no）。"
      },
      {
        "key": "IdentityAgent",
        "nameLocalized": "身份代理套接字",
        "defaultValue": "SSH_AUTH_SOCK",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "string",
        "candidates": [],
        "helpText": "指定用于身份验证的认证代理（ssh-agent）套接字路径。支持设置具体的 UNIX 套接字路径、none（完全禁用 agent），或使用环境变量（如 $SSH_AUTH_SOCK）。"
      },
      {
        "key": "IdentityFile",
        "nameLocalized": "私钥文件",
        "defaultValue": "~/.ssh/id_*",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "string",
        "candidates": [],
        "helpText": "指定用于公钥身份验证的私钥文件路径（如 ~/.ssh/id_ed25519、~/.ssh/id_rsa）。可配置多个文件，客户端将按顺序逐一尝试。"
      },
      {
        "key": "KbdInteractiveAuthentication",
        "nameLocalized": "键盘交互认证",
        "defaultValue": "yes",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定是否启用键盘交互式身份验证（Keyboard-Interactive，常用于二次验证/双因子认证/2FA、OTP 动态验证码等）。可选参数为 yes（默认）或 no。"
      },
      {
        "key": "KbdInteractiveDevices",
        "nameLocalized": "键盘交互设备",
        "defaultValue": "pam",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "string",
        "candidates": [],
        "helpText": "指定键盘交互式身份验证所允许使用的认证设备或子方法列表（以逗号分隔，如 pam、skey 等）。"
      },
      {
        "key": "NoHostAuthenticationForLocalhost",
        "nameLocalized": "本机免主机认证",
        "defaultValue": "no",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定在连接目标为 localhost 时，是否跳过主机公钥身份验证。通常在本地进行端口重定向或测试时使用。可选参数为 yes 或 no（默认：no）。"
      },
      {
        "key": "NumberOfPasswordPrompts",
        "nameLocalized": "密码提示次数",
        "defaultValue": "3",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "integer",
        "candidates": [],
        "helpText": "设置密码认证失败时允许用户重新输入密码的最大重试次数。默认值为 3。"
      },
      {
        "key": "PasswordAuthentication",
        "nameLocalized": "密码认证",
        "defaultValue": "yes",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定是否启用基于密码的身份验证方式。可选参数为 yes（默认）或 no。推荐在已配置免密公钥的环境下设为 no 以增强安全性。"
      },
      {
        "key": "PKCS11Provider",
        "nameLocalized": "PKCS11 模块",
        "defaultValue": "none",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "string",
        "candidates": [],
        "helpText": "指定用于智能卡或硬件安全令牌（如 YubiKey、U2F）的 PKCS#11 动态库驱动提供者路径。"
      },
      {
        "key": "PreferredAuthentications",
        "nameLocalized": "首选认证方式",
        "defaultValue": "default",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "string",
        "candidates": [],
        "helpText": "指定客户端尝试各种身份验证方法的优先级顺序，以逗号分隔。例如：publickey,keyboard-interactive,password。"
      },
      {
        "key": "PubkeyAuthentication",
        "nameLocalized": "公钥认证",
        "defaultValue": "yes",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定是否尝试使用公钥密码体制进行身份验证。可选参数为 yes（默认值）或 no。强烈推荐开启。"
      },
      {
        "key": "RequiredRSASize",
        "nameLocalized": "RSA 密钥最小位数",
        "defaultValue": "1024",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "string",
        "candidates": [],
        "helpText": "设置允许使用的 RSA 密钥的最小位数（单位：比特）。任何低于此位数的 RSA 密钥都将被拒绝连接。默认通常为 1023。"
      },
      {
        "key": "SecurityKeyProvider",
        "nameLocalized": "安全密钥中间件",
        "defaultValue": "internal",
        "group": "Authentication",
        "groupLocalized": "认证",
        "type": "string",
        "candidates": [],
        "helpText": "指定用于 FIDO/U2F 硬件安全密钥（如 ecdsa-sk、ed25519-sk 算法）的中间件库路径，默认为 internal（内置支持）。"
      }
    ]
  },
  {
    "id": "Algorithms",
    "name": "Algorithms",
    "nameLocalized": "算法",
    "options": [
      {
        "key": "CASignatureAlgorithms",
        "nameLocalized": "CA 签名算法",
        "defaultValue": "default",
        "group": "Algorithms",
        "groupLocalized": "算法",
        "type": "string",
        "candidates": [],
        "helpText": "指定客户端用于验证证书颁发机构（CA）签名的数字签名算法列表，以逗号分隔。"
      },
      {
        "key": "Ciphers",
        "nameLocalized": "对称加密算法",
        "defaultValue": "default",
        "group": "Algorithms",
        "groupLocalized": "算法",
        "type": "string",
        "candidates": [],
        "helpText": "指定加密会话数据所允许使用的对称加密算法列表（密码套件），以逗号分隔。例如 chacha20-poly1305@openssh.com, aes128-gcm@openssh.com, aes256-gcm@openssh.com 等。排在前面的算法优先级最高。"
      },
      {
        "key": "HostbasedAcceptedAlgorithms",
        "nameLocalized": "基于主机认证算法",
        "defaultValue": "default",
        "group": "Algorithms",
        "groupLocalized": "算法",
        "type": "string",
        "candidates": [],
        "helpText": "指定基于主机的身份验证（HostbasedAuthentication）中客户端所接受的主机密钥算法列表，以逗号分隔。"
      },
      {
        "key": "HostKeyAlgorithms",
        "nameLocalized": "主机公钥算法",
        "defaultValue": "default",
        "group": "Algorithms",
        "groupLocalized": "算法",
        "type": "string",
        "candidates": [],
        "helpText": "指定客户端在与服务器握手时所接受的服务器主机密钥算法列表，以逗号分隔并按优先级排列（例如 ssh-ed25519, rsa-sha2-512, rsa-sha2-256）。"
      },
      {
        "key": "KexAlgorithms",
        "nameLocalized": "密钥交换算法",
        "defaultValue": "default",
        "group": "Algorithms",
        "groupLocalized": "算法",
        "type": "string",
        "candidates": [],
        "helpText": "指定密钥交换阶段（Key Exchange）允许使用的算法列表，以逗号分隔（如 curve25519-sha256, diffie-hellman-group14-sha256 等）。"
      },
      {
        "key": "MACs",
        "nameLocalized": "消息验证码算法",
        "defaultValue": "default",
        "group": "Algorithms",
        "groupLocalized": "算法",
        "type": "string",
        "candidates": [],
        "helpText": "指定用于数据完整性校验的消息认证码（MAC）算法列表，以逗号分隔（如 hmac-sha2-256-etm@openssh.com 等）。注意在使用 AEAD 密码模式（如 AES-GCM 或 ChaCha20-Poly1305）时无需单独 MAC。"
      },
      {
        "key": "PubkeyAcceptedAlgorithms",
        "nameLocalized": "接受的公钥算法",
        "defaultValue": "default",
        "group": "Algorithms",
        "groupLocalized": "算法",
        "type": "string",
        "candidates": [],
        "helpText": "指定客户端公钥认证过程中允许使用的签名算法列表，以逗号分隔（如 ssh-ed25519, rsa-sha2-512, rsa-sha2-256 等）。在排查旧版服务端不支持 rsa-sha2 导致的公钥拒绝时常需配置此项。"
      }
    ]
  },
  {
    "id": "Canonicalize",
    "name": "Canonicalize",
    "nameLocalized": "规范化",
    "options": [
      {
        "key": "CanonicalDomains",
        "nameLocalized": "规范化域名列表",
        "defaultValue": "none",
        "group": "Canonicalize",
        "groupLocalized": "规范化",
        "type": "string",
        "candidates": [],
        "helpText": "指定在启用主机名规范化（CanonicalizeHostname）时要追加尝试搜索的顶级域名或搜索域列表，以空格分隔。"
      },
      {
        "key": "CanonicalizeFallbackLocal",
        "nameLocalized": "规范化回退本地",
        "defaultValue": "yes",
        "group": "Canonicalize",
        "groupLocalized": "规范化",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定在主机名规范化失败时，是否回退并直接使用未经规范化的原始主机名尝试进行常规解析。可选参数为 yes（默认）或 no。"
      },
      {
        "key": "CanonicalizeHostname",
        "nameLocalized": "主机名规范化",
        "defaultValue": "no",
        "group": "Canonicalize",
        "groupLocalized": "规范化",
        "type": "choice",
        "candidates": [
          "yes",
          "no",
          "always"
        ],
        "helpText": "指定是否对命令行或配置中的目标主机名执行规范化转换（自动补齐搜索域）。可选值为 yes、no（默认值）或 always。"
      },
      {
        "key": "CanonicalizeMaxDots",
        "nameLocalized": "规范化最大点数",
        "defaultValue": "1",
        "group": "Canonicalize",
        "groupLocalized": "规范化",
        "type": "integer",
        "candidates": [],
        "helpText": "指定主机名规范化所允许包含的最大句点（圆点 .）数量。超过此数量的主机名将不进行规范化补齐，默认值为 1。"
      },
      {
        "key": "CanonicalizePermittedCNAMEs",
        "nameLocalized": "规范化允许别名",
        "defaultValue": "none",
        "group": "Canonicalize",
        "groupLocalized": "规范化",
        "type": "string",
        "candidates": [],
        "helpText": "指定在规范化过程中允许遵循的 CNAME 别名重定向规则列表，用于防止恶意的递归 CNAME 劫持。"
      }
    ]
  },
  {
    "id": "Multiplexing",
    "name": "Multiplexing",
    "nameLocalized": "多路复用",
    "options": [
      {
        "key": "ControlMaster",
        "nameLocalized": "主控制连接复用",
        "defaultValue": "no",
        "group": "Multiplexing",
        "groupLocalized": "多路复用",
        "type": "choice",
        "candidates": [
          "yes",
          "no",
          "ask",
          "auto",
          "autoask"
        ],
        "helpText": "启用单个网络连接上的多路复用共享（Multiplexing）。可选值：no（默认，不复用）、yes（作为主控进程并在后台监听复用请求）、auto（若主控连接存在则加入复用，否则自动创建为主控）、autoask（类似 auto 但每次重用均询问确认）。大幅加快频繁连接相同服务器的速度。"
      },
      {
        "key": "ControlPath",
        "nameLocalized": "控制套接字路径",
        "defaultValue": "none",
        "group": "Multiplexing",
        "groupLocalized": "多路复用",
        "type": "string",
        "candidates": [],
        "helpText": "指定连接共享（ControlMaster）时创建的控制套接字（UNIX domain socket）文件存储路径。常用格式如 ~/.ssh/sockets/%r@%h:%p，其中 %r 为用户名，%h 为目标主机，%p 为端口。"
      }
    ]
  },
  {
    "id": "Post Command",
    "name": "Post Command",
    "nameLocalized": "后置命令",
    "options": [
      {
        "key": "LocalCommand",
        "nameLocalized": "本地命令",
        "defaultValue": "none",
        "group": "Post Command",
        "groupLocalized": "后置命令",
        "type": "string",
        "candidates": [],
        "helpText": "指定在与服务器成功建立连接后，在客户端本地机器上自动执行的 Shell 命令行。必须与 PermitLocalCommand 配合使用。"
      },
      {
        "key": "PermitLocalCommand",
        "nameLocalized": "允许本地命令",
        "defaultValue": "no",
        "group": "Post Command",
        "groupLocalized": "后置命令",
        "type": "choice",
        "candidates": [
          "yes",
          "no"
        ],
        "helpText": "指定是否允许执行 LocalCommand 声明的本地命令。出于安全考虑，默认值为 no。仅在充分确信命令安全的情况下设为 yes。"
      },
      {
        "key": "RemoteCommand",
        "nameLocalized": "远程命令",
        "defaultValue": "none",
        "group": "Post Command",
        "groupLocalized": "后置命令",
        "type": "string",
        "candidates": [],
        "helpText": "指定在成功登录后，在远程服务器上替代默认登录 Shell 自动执行的命令字符串。"
      }
    ]
  }
];

export const ALL_SSH_DIRECTIVES: SSHDirectiveInfo[] = SSH_DIRECTIVE_GROUPS.flatMap((g) => g.options);

const DIRECTIVE_MAP = new Map<string, SSHDirectiveInfo>();
ALL_SSH_DIRECTIVES.forEach((d) => {
  DIRECTIVE_MAP.set(d.key.toLowerCase(), d);
});

export function findDirective(key: string): SSHDirectiveInfo | undefined {
  return DIRECTIVE_MAP.get(key.toLowerCase());
}
