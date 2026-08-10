const { readConfigKeywords, appendContentRows } = require('../../lib/sheets');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YT_BASE = 'https://www.googleapis.com/youtube/v3';

// 오늘 날짜 문자열 (YYYYMMDD, KST 기준)
function todayStr() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10).replace(/-/g, '');
}

// C그룹(광범위 키워드)은 격일로만 돌린다 - 날짜의 '일'이 짝수일 때만 포함
function shouldRunGroupC() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCDate() % 2 === 0;
}

async function searchRecentVideos(keyword) {
  const publishedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const url = `${YT_BASE}/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&order=viewCount&publishedAfter=${publishedAfter}&maxResults=10&regionCode=KR&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.items) return [];
  return data.items.map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelId: item.snippet.channelId,
    thumbnail: item.snippet.thumbnails?.medium?.url || '',
    publishedAt: item.snippet.publishedAt,
  }));
}

async function getVideoStats(videoIds) {
  if (!videoIds.length) return {};
  const url = `${YT_BASE}/videos?part=statistics&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const map = {};
  (data.items || []).forEach((item) => {
    map[item.id] = {
      views: Number(item.statistics.viewCount || 0),
      likes: Number(item.statistics.likeCount || 0),
      comments: Number(item.statistics.commentCount || 0),
    };
  });
  return map;
}

async function getChannelSubs(channelIds) {
  const uniqueIds = [...new Set(channelIds)];
  if (!uniqueIds.length) return {};
  const url = `${YT_BASE}/channels?part=statistics&id=${uniqueIds.join(',')}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const map = {};
  (data.items || []).forEach((item) => {
    map[item.id] = Number(item.statistics.subscriberCount || 0);
  });
  return map;
}

const SCORE_THRESHOLD = 0.5; // 조회수 ÷ 구독자수 배율 기준값

module.exports = async function handler(req, res) {
  // Vercel Cron이 아닌 외부에서의 무단 호출 방지 (선택적이지만 권장)
  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: 'YOUTUBE_API_KEY 환경변수가 없습니다.' });
  }

  try {
    const allKeywords = await readConfigKeywords();
    const runC = shouldRunGroupC();

    const activeKeywords = allKeywords.filter((k) => {
      if (!k.active) return false;
      if (k.group === 'C') return runC;
      return true; // A, B는 매일
    });

    const date = todayStr();
    const outputRows = [];
    let rowIndex = 1;

    for (const kw of activeKeywords) {
      const videos = await searchRecentVideos(kw.keyword);
      if (!videos.length) continue;

      const stats = await getVideoStats(videos.map((v) => v.videoId));
      const subs = await getChannelSubs(videos.map((v) => v.channelId));

      const scored = videos
        .map((v) => {
          const st = stats[v.videoId] || { views: 0, likes: 0, comments: 0 };
          const subCount = subs[v.channelId] || 0;
          const score = subCount > 0 ? st.views / subCount : 0;
          return { ...v, ...st, subCount, score };
        })
        .filter((v) => v.score >= SCORE_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      for (const v of scored) {
        const id = `${date}-yt-${String(rowIndex).padStart(3, '0')}`;
        rowIndex += 1;
        outputRows.push([
          id,
          date,
          'youtube',
          kw.keyword,
          `https://www.youtube.com/watch?v=${v.videoId}`,
          v.title,
          v.thumbnail,
          v.views,
          v.likes,
          v.comments,
          v.subCount,
          v.score.toFixed(2),
          '', // hook_tags - 2단계(Claude 분석)에서 채워짐
          '', // analysis
          '', // my_version
          '미판정',
          'FALSE',
        ]);
      }
    }

    await appendContentRows(outputRows);

    return res.status(200).json({
      success: true,
      keywordsChecked: activeKeywords.length,
      rowsAdded: outputRows.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
