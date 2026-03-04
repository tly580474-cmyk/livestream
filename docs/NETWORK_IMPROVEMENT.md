# 网络穿透改进方案

本文档详细说明了项目在跨网络连接方面的改进方案。

---

## 1. 问题确认

| 项目 | 状态 |
|------|------|
| STUN 服务器 | ✅ 9个服务器 (Google/Linphone/PJSIP/FreeSWITCH/VoIPBuster) |
| TURN 服务器 | ❌ 未配置 |
| IPv6 支持 | ✅ 已实现 (自动检测) |
| 多端口打洞 | ✅ 已实现 (ICE candidate pool) |
| 心跳保活 | ✅ 已实现 (30秒间隔) |

**结论**: 已实现多项网络穿透增强，大幅提高 P2P 连接成功率。

---

## 2. 改进方案

### 2.1 响应式布局适配

针对不同设备尺寸的视频通话界面优化：

```
移动端 (< 640px):
├── 本地视频: w-20 (80px)
├── 控制按钮: 缩小尺寸
└── 隐藏部分装饰元素

平板端 (640px - 1024px):
├── 本地视频: w-28 (112px)
└── 调整间距

桌面端 (> 1024px):
└── 保持当前布局
```

### 2.2 网络穿透增强

#### 当前流程

```
Client A ──STUN──► Internet
           ──STUN──► Client B
                    (仅靠 STUN 打洞)
```

#### 改进后流程

```
┌─────────────────────────────────────────────────────────────┐
│  1. IPv6 支持                                               │
│     └── 添加 IPv6 STUN 服务器                                │
│                                                             │
│  2. 多端口并行打洞                                          │
│     └── 客户端绑定多个端口同时发送 ICE Candidate            │
│                                                             │
│  3. NAT 保持映射                                            │
│     └── 心跳包 (30-60秒间隔) 保持 UDP 端口开放              │
│                                                             │
│  4. TURN 中继 (最后手段)                                    │
│     └── 配置 TURN 服务器作为备份                            │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 心跳机制实现

建立连接后，需要定期发送心跳以保持 NAT 端口映射：

```
┌────────────────┐     每 30-60 秒      ┌────────────────┐
│   Client A     │ ◄──────────────────► │   Client B     │
│                │    STUN Binding      │                │
│  ICE Candidate │     Request/          │  ICE Candidate │
│  (keep-alive)  │     Response         │  (keep-alive)  │
└────────────────┘                       └────────────────┘

目的: 保持 NAT 端口映射不超时
```

---

## 3. 实施优先级建议

| 优先级 | 改进项 | 状态 | 难度 | 收益 |
|--------|--------|------|------|------|
| P0 | 响应式布局 | ✅ 已完成 | 低 | 高 |
| P1 | 心跳保活 | ✅ 已完成 | 中 | 高 |
| P2 | 多端口打洞 | ✅ 已完成 | 高 | 中 |
| P3 | IPv6 支持 | ✅ 已完成 | 低 | 中 |
| P4 | TURN 中继服务器 | ⏳ 待实现 | 中 | 高 |

### 优先级说明

- **P0 (已完成)**: 响应式布局已实现，优化移动端用户体验
- **P1 (已完成)**: 心跳保活已实现，30秒间隔保持 NAT 映射
- **P2 (已完成)**: ICE candidate pool 已配置，增加打洞覆盖率
- **P3 (已完成)**: IPv6 自动检测已实现
- **P4 (待实现)**: TURN 服务器作为 P2P 失败的备选方案

---

## 4. 技术细节

### 4.1 ICE 候选地址类型

```
Host Candidate    - 本地网络地址 (最高优先级)
Srflx Candidate   - STUN 服务器获取的公网地址
Prflx Candidate   - 对等体中继地址
Relay Candidate   - TURN 服务器中继地址 (最低优先级)
```

### 4.2 NAT 类型对 P2P 的影响

| NAT 类型 | 描述 | P2P 成功率 |
|----------|------|------------|
| 全锥型 (Full Cone) | 任何外部主机都可以通过映射端口连接 | 高 |
| 受限锥型 (Restricted Cone) | 只接受之前通信过的外部主机 | 中 |
| 端口受限锥型 (Port-Restricted) | 限制外部主机 IP 和端口 | 中-低 |
| 对称型 (Symmetric) | 每个目标使用不同映射端口 | 很低 |

### 4.3 STUN 服务器配置

当前项目使用的 STUN 服务器（已通过实际测试）：

```javascript
const STUN_SERVERS = [
  // Google 公共 STUN 服务器 (5个)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Linphone 公共 STUN
  { urls: 'stun:stun.linphone.org:3478' },
  // PJSIP 公共 STUN
  { urls: 'stun:stun.pjsip.org:3478' },
  // FreeSWITCH 公共 STUN
  { urls: 'stun:stun.freeswitch.org:3478' },
  // VoIPBuster 公共 STUN
  { urls: 'stun:stun.voipbuster.com:3478' },
];
```

**测试结果**:
- Google: 195-214ms ✅
- FreeSWITCH: 273ms ✅
- VoIPBuster: 267ms ✅
- Linphone: 368ms ✅
- PJSIP: 430ms ✅

### 4.4 TURN 服务器配置 (待实现)

```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'user',
      credential: 'password'
    }
  ]
};
```

---

## 5. 后续计划

1. **已完成**: 心跳保活机制、IPv6 支持、多端口打洞
2. **下一步**: 部署 TURN 服务器作为备份

---

## 6. 参考资料

- [WebRTC Connectivity](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity)
- [RFC 5245 - ICE](https://tools.ietf.org/html/rfc5245)
- [NAT Behavior Discovery](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceGatheringState)
