import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sixtyseven.lang';
const SUPPORTED = ['en', 'zh'];

function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  if (typeof nav === 'string' && nav.toLowerCase().startsWith('zh')) return 'zh';
  return 'en';
}

const dict = {
  en: {
    'common.back': '← Back',
    'common.loading': 'Loading…',
    'common.refresh': 'Refresh',

    'app.brand': '67 Challenge',
    'app.langToggle': '中文',

    'landing.tagline': '20 seconds. Move fast. Beat the leaderboard.',
    'landing.start': 'Start Challenge',
    'landing.leaderboard': 'Leaderboard',
    'landing.how': 'How It Works',
    'landing.privacy':
      'Camera frames are processed locally in your browser. We do not upload or store your video.',
    'landing.feature.timer.title': '20s Challenge',
    'landing.feature.timer.desc': 'Sprint your arms for 20 seconds. Every rep counts.',
    'landing.feature.camera.title': 'Camera Tracking',
    'landing.feature.camera.desc': 'On-device pose AI tracks each wrist movement in real time.',
    'landing.feature.board.title': 'Global Leaderboard',
    'landing.feature.board.desc': 'Submit your score and climb the worldwide ranks.',
    'landing.howTitle': 'How it works',
    'landing.how1': 'Allow camera access. Stand back so your upper body is visible.',
    'landing.how2': 'The countdown starts: 3, 2, 1, GO!',
    'landing.how3': 'Pump your arms up and down as fast as you can for 20 seconds.',
    'landing.how4': 'Submit your score and check the leaderboard.',
    'landing.footer': 'made by hahaTT',

    'game.statusWaitingCamera': 'Waiting for camera…',
    'game.statusModelError': 'Pose model error: {msg}',
    'game.statusModelLoading': 'Loading pose model…',
    'game.statusStepBack': 'Step back and keep your upper body visible.',
    'game.statusReady': 'Ready! Tap Start when you are set.',
    'game.feedbackTooSmall':
      'Amplitude too small — raise your hands a bit higher to score.',
    'game.start': 'Start',
    'game.cancel': 'Cancel',
    'game.meter.title': 'Range',
    'game.meter.hint': 'Higher swing\nmeans more points',

    'permission.title': 'Camera required',
    'permission.hint':
      'Please allow camera access. Frames are processed locally and never uploaded.',
    'permission.allow': 'Allow Camera',

    'score.score': 'Score',
    'score.time': 'Time',

    'result.timesUp': "Time's up!",
    'result.personalBest': 'Personal best',
    'result.worldRank': 'World rank',
    'result.nickname': 'Nickname',
    'result.namePlaceholder': 'Your name',
    'result.submit': 'Submit Score',
    'result.submitting': 'Submitting…',
    'result.submitted': 'Score submitted! 🎉',
    'result.playAgain': 'Play Again',
    'result.viewBoard': 'View Leaderboard',
    'result.share': 'Copy / Share',
    'result.shareCopied': 'Copied to clipboard!',
    'result.shareShared': 'Shared!',
    'result.shareUnavailable': 'Share unavailable.',
    'result.shareText': 'I scored {score} in 67 Challenge. Can you beat me? {url}',
    'result.errLength': 'Nickname must be 2–20 characters',
    'result.errChars': 'Only letters, digits, Chinese, space, _ and - allowed',
    'result.errSubmit': 'Score saved locally, but failed to submit online{detail}. Please try again.',
    'result.errFallback': 'Failed to load leaderboard',

    'rating.beginner': 'Beginner',
    'rating.warming': 'Warming Up',
    'rating.fast': 'Fast',
    'rating.insane': 'Insane',
    'rating.monster': 'Monster',

    'board.title': 'Leaderboard',
    'board.all': 'All Time',
    'board.today': 'Today',
    'board.week': 'This Week',
    'board.col.rank': 'Rank',
    'board.col.nickname': 'Nickname',
    'board.col.score': 'Score',
    'board.col.date': 'Date',
    'board.empty': 'No scores yet — be the first!',
    'board.footer': 'Top 100 scores. Order: highest score first, ties broken by earliest submission.',

    'how.title': 'How It Works',
    'how.intro':
      '67 Challenge is a 20-second arm-speed game. Your browser uses on-device pose detection (MediaPipe) to track your wrists. Every up-down swing counts — the bigger the swing, the more points.',
    'how.step1': 'Click Start Challenge on the home screen.',
    'how.step2': 'Grant camera permission. Frames stay on your device.',
    'how.step3': 'Step back so your shoulders, elbows, and wrists are visible.',
    'how.step4': 'Get ready — the countdown 3, 2, 1, GO! starts the timer.',
    'how.step5': 'Pump both arms up and down as fast as you can for 20 seconds.',
    'how.step6': 'Submit your nickname and score to the global leaderboard.',
    'how.tipsTitle': 'Tips',
    'how.tip1': 'Bright, even lighting works best.',
    'how.tip2': 'Stand 1.5–2m from the camera.',
    'how.tip3': 'Keep your upper body centered in the frame.',
    'how.tip4': 'Tiny movements still count, but bigger swings score more.',
    'how.privacyTitle': 'Privacy',
    'how.privacyText':
      'Video frames never leave your device. Only your nickname and score are sent when you submit a result.',
  },
  zh: {
    'common.back': '← 返回',
    'common.loading': '加载中…',
    'common.refresh': '刷新',

    'app.brand': '67 挑战',
    'app.langToggle': 'EN',

    'landing.tagline': '20 秒,极速挥手,登顶排行榜。',
    'landing.start': '开始挑战',
    'landing.leaderboard': '排行榜',
    'landing.how': '玩法说明',
    'landing.privacy': '摄像头画面只在你的浏览器本地处理,我们不会上传或保存任何视频。',
    'landing.feature.timer.title': '20 秒挑战',
    'landing.feature.timer.desc': '20 秒里全力挥动双臂,每一下都计分。',
    'landing.feature.camera.title': '摄像头识别',
    'landing.feature.camera.desc': '本地姿态 AI 实时追踪你的手腕动作。',
    'landing.feature.board.title': '全球排行榜',
    'landing.feature.board.desc': '提交分数,冲击全球排名。',
    'landing.howTitle': '玩法',
    'landing.how1': '允许摄像头权限,站远一点露出上半身。',
    'landing.how2': '倒计时 3、2、1,GO!',
    'landing.how3': '20 秒内尽全力上下挥动双臂。',
    'landing.how4': '提交分数,查看排行榜。',
    'landing.footer': 'made by hahaTT',

    'game.statusWaitingCamera': '正在请求摄像头…',
    'game.statusModelError': '姿态模型错误:{msg}',
    'game.statusModelLoading': '加载姿态模型…',
    'game.statusStepBack': '请站远一点,让上半身完整出现在画面里。',
    'game.statusReady': '准备好了!点击开始。',
    'game.feedbackTooSmall': '幅度太小 — 把手抬高一点才能计分。',
    'game.start': '开始',
    'game.cancel': '取消',
    'game.meter.title': '幅度',
    'game.meter.hint': '幅度越大\n得分越高',

    'permission.title': '需要摄像头权限',
    'permission.hint': '请允许使用摄像头。画面只在本地处理,不会上传。',
    'permission.allow': '允许摄像头',

    'score.score': '得分',
    'score.time': '剩余',

    'result.timesUp': '时间到!',
    'result.personalBest': '个人最佳',
    'result.worldRank': '全球排名',
    'result.nickname': '昵称',
    'result.namePlaceholder': '你的名字',
    'result.submit': '提交分数',
    'result.submitting': '提交中…',
    'result.submitted': '已提交! 🎉',
    'result.playAgain': '再来一次',
    'result.viewBoard': '查看排行榜',
    'result.share': '复制 / 分享',
    'result.shareCopied': '已复制到剪贴板!',
    'result.shareShared': '已分享!',
    'result.shareUnavailable': '当前不可分享。',
    'result.shareText': '我在 67 挑战拿了 {score} 分,你能超过我吗? {url}',
    'result.errLength': '昵称需为 2–20 个字符',
    'result.errChars': '仅支持字母、数字、中文、空格、_ 和 -',
    'result.errSubmit': '分数已本地保存,但在线提交失败{detail}。请重试。',
    'result.errFallback': '加载排行榜失败',

    'rating.beginner': '新手',
    'rating.warming': '热身中',
    'rating.fast': '飞快',
    'rating.insane': '疯狂',
    'rating.monster': '怪兽',

    'board.title': '排行榜',
    'board.all': '总榜',
    'board.today': '今日',
    'board.week': '本周',
    'board.col.rank': '排名',
    'board.col.nickname': '昵称',
    'board.col.score': '分数',
    'board.col.date': '时间',
    'board.empty': '还没有分数 — 来当第一名!',
    'board.footer': '只显示前 100 名。先按分数从高到低,再按最早提交时间排序。',

    'how.title': '玩法说明',
    'how.intro':
      '67 挑战是一个 20 秒手臂速度小游戏。浏览器在本地使用 MediaPipe 姿态识别追踪你的手腕,每一次上下挥动都会计分,幅度越大分越高。',
    'how.step1': '在首页点击「开始挑战」。',
    'how.step2': '允许摄像头权限,画面只在本地处理。',
    'how.step3': '站远一点,让肩膀、手肘、手腕都在画面中。',
    'how.step4': '准备好,倒计时 3、2、1、GO!',
    'how.step5': '20 秒内尽全力上下挥动双臂。',
    'how.step6': '提交昵称和分数到全球排行榜。',
    'how.tipsTitle': '小提示',
    'how.tip1': '光线明亮均匀效果最好。',
    'how.tip2': '距离摄像头 1.5–2 米最佳。',
    'how.tip3': '保持上半身居中。',
    'how.tip4': '小动作也能算分,但大幅度得分更高。',
    'how.privacyTitle': '隐私',
    'how.privacyText': '视频画面不会离开你的设备。提交结果时只发送你的昵称和分数。',
  },
};

function format(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : ''));
}

const I18nContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => detectLang());

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

  const setLang = useCallback((l) => {
    if (!SUPPORTED.includes(l)) return;
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    setLangState(l);
  }, []);

  const value = useMemo(() => {
    const table = dict[lang] || dict.en;
    const t = (key, params) => format(table[key] ?? dict.en[key] ?? key, params);
    return { lang, setLang, t };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageToggle({ className = '' }) {
  const { lang, setLang, t } = useI18n();
  const next = lang === 'zh' ? 'en' : 'zh';
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      className={`rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur transition hover:bg-white/15 ${className}`}
      aria-label="Toggle language"
      title={next === 'zh' ? '切换到中文' : 'Switch to English'}
    >
      {t('app.langToggle')}
    </button>
  );
}
