import type { Word } from './model'

// Grupos de situaciones prácticas; una palabra puede servir en varios temas.
export const topics = [
  { id: 'conversar', label: 'Primeras conversaciones', words: '你好 早上好 晚安 再见 谢谢 对不起 请 请问 不客气 没关系 没事 不好意思 喂 叫 名字 姓 姓名 认识 介绍 见 说 说话 告诉 听 听见 问 问题 什么 谁 哪 哪个 哪里 哪儿 怎么 怎么样 为什么 吧 吗 呢 啊 是 不 不要 可以 能 会 对 错 好 不错 知道 懂 不 那 这 这个 那个 这样 那样 这么 那么' },
  { id: 'personas', label: 'Personas y relaciones', words: '我 我们 你 你们 您 他 她 它 他们 她们 它们 自己 人 大家 孩子 小孩儿 小朋友 男 女 男孩儿 女孩儿 男朋友 女朋友 女士 先生 爸爸 妈妈 哥哥 弟弟 姐姐 妹妹 儿子 女儿 奶奶 爷爷 丈夫 妻子 家人 朋友 同学 老师 学生 医生 爱 生日 送 一起 名字 姓 姓名 认识 介绍 中国 外国 国' },
  { id: 'comer', label: 'Comer y beber', words: '吃 喝 做饭 饭 米饭 面包 面条儿 包子 饺子 菜 水 水果 苹果 鸡蛋 肉 鱼 牛奶 茶 红茶 绿茶 奶茶 咖啡 饭店 饭馆 杯子 早饭 午饭 晚饭 好吃 饿 点' },
  { id: 'ciudad', label: 'Ciudad, compras y viajes', words: '车 出租车 打车 公交车 火车 飞机 地铁 车站 机场 机票 票 门票 商店 店 超市 商场 饭店 饭馆 酒店 钱 元 块 贵 便宜 买 卖 出国 旅游 外国 中国 国 走 走路 路 路上 跑 跑步 坐 开车 去 来 到 回 回来 回去 出来 出去 进去 进来 过来 过去 上来 上去 下来 下去 往 离 近 远 左 右 左边 右边 旁边 前面 后面 哪里 哪儿 这里 这儿 那里 那儿 洗手间' },
  { id: 'tiempo', label: 'Tiempo y rutina', words: '今天 昨天 明天 今年 明年 去年 早 早上 早饭 上午 中午 下午 晚 晚上 晚饭 午饭 白天 天 年 月 日 周 星期 星期日 星期天 时间 时候 小时候 点 分 分钟 小时 时 号 现在 一会儿 一下 有时 经常 每 已经 正在 起床 睡 睡觉 休息 上班 下班 上课 下课 上学 开学 过年 生日 准备 开始 完' },
  { id: 'casa', label: 'Casa y cosas', words: '家 房间 床 门 门口 桌子 椅子 杯子 电视 电脑 手机 电话 手表 衣服 裤子 包 书包 书 本子 笔 东西 洗 睡 睡觉 起床 做饭 住 打开 上网 网上 里面 外面 外边 里面 上面 下面 前面 后面 旁边 里 这边 那边' },
  { id: 'estudio', label: 'Estudio, trabajo y aficiones', words: '学 学习 学生 学校 小学 小学生 中学 中学生 高中 大学 大学生 老师 同学 课 上课 下课 上学 开学 班 教 教室 书 书店 书包 本 本子 笔 汉语 汉字 中文 字 词 读 读书 写 考 考试 题 电脑 公司 工作 上班 下班 上网 网上 电话 打电话 唱 歌 看 电影 电影院 爱好 玩 好玩儿 有意思 画 篮球 球 跑 跑步 足球 踢 跳舞 游泳 运动' },
  { id: 'bienestar', label: 'Cuerpo y bienestar', words: '身体 头 面 口 手 眼睛 病 生病 看病 医生 医院 药 药店 疼 舒服 累 忙 高兴 快乐 开心 好 不好意思 想 喜欢 爱 希望 没意思 有意思 难过 冷 热 洗 休息 跑步 运动 游泳' },
  { id: 'naturaleza', label: 'Naturaleza y animales', words: '天气 天 晴 阴 下雨 雨 雪 水 月 日 花 鱼 狗 猫 鸟 白色 黑色 红色 绿色 颜色 热 冷' },
  { id: 'cantidades', label: 'Números y cantidades', words: '一 二 两 三 四 五 六 七 八 九 十 百 千 万 零 半 一半 多少 几 多 少 些 一些 有些 一点儿 有点儿 太 很 非常 最 点 分 分钟 小时 岁 号 个 本 件 块 口 次 条 只 位 名 间 元 票 钱' },
  { id: 'describir', label: 'Describir y sentir', words: '好 不错 坏 大 小 高 长 个子 快 慢 近 远 多 少 冷 热 贵 便宜 新 漂亮 好看 好听 好吃 好玩儿 颜色 白色 黑色 红色 绿色 高兴 快乐 累 忙 舒服 想 觉得 喜欢 爱 希望 没意思 有意思 真 太 很 非常 最' },
  { id: 'acciones', label: 'Acciones cotidianas', words: '穿 给 开 看 看见 找 做 帮 帮忙 出 出门 打 等 动 飞 过 进 拿 起来 让 忘 笑 游 站 走 来 去 回 说 听 吃 喝 睡 买 卖 工作 学习 上班 下班 上学 休息 洗 打开 准备 记得' },
  { id: 'situar', label: 'Lugares y direcciones', words: '边 后 前 上 下 外 里 在 这 这边 这里 这儿 这些 那 那边 那里 那儿 那些 哪里 哪儿 从 近 远 旁边 左 右 左边 右边 前面 后面 里面 外面 上面 下面 楼 门 门口 路 路上 站 往 离 出 进 来 去 回 过 进去 出去 回来 回去 上来 上去 下来 下去 过来 过去' },
  { id: 'conectar', label: 'Palabras para conectar ideas', words: '的 第 都 还 和 了 没有 们 要 也 有 有的 再 在 哪些 这些 比 别 从 从小 但 但是 得 地 等 跟 还是 就 可能 快要 让 虽然 所以 因为 着 正 正在 事 事情 意思 这个 那个 那么 这样 这么 那样 什么 谁 吗 呢 吧 啊 能 可以 会 不 不要 一下 些 一些 有些 有点儿 没事 没关系' },
] as const

const topicWords = new Map<string, Set<string>>(topics.map(topic => [topic.id, new Set(topic.words.split(/\s+/))]))
export function belongsToTopic(word: Pick<Word, 'hanzi' | 'hskId'>, topic: string): boolean {
  if (topic === 'all') return true
  if (word.hskId === 'w00357' && topic === 'naturaleza') return false
  if (word.hskId === 'w00357' && topic === 'ciudad') return true
  if (topic === 'other') return !topics.some(item => belongsToTopic(word, item.id))
  return topicWords.get(topic)?.has(word.hanzi) ?? false
}
