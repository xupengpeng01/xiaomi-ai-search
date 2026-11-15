export const devices = ['本机', 'Xiaomi 17 Ultra', 'Xiaomi Pad 9'];
export const filters = ['综合', '文档', '图片', '文件夹', '图片', '视频', '音频', '压缩包', '应用', '其它'];
export const initialHistory = ['团建合照', '汽车漂移', '团建费用', 'Adobe Photoshop 2026', '本周待办', 'Blender'];
export const imagePath = (name) => `/figma/${name}.png`;

const documentPath = 'D:\\ Project \\ 部门团建 \\ 四姑娘山';
const audioPath = '手机存储 / Android / data / com.android.soundrecorder / files';
const folderPath = 'D:\\ 学习 \\ 3D';
const archivePath = 'D:\\ 安装包 \\ Adobe';
const timestamps = ['2024/5/28 20:00', '2024/5/26 13:40', '2024/5/24 15:36', '2024/5/22 16:18'];

function rows(type, index, tags, path, entries) {
  return entries.map(([name, icon, snippet, location], order) => ({
    id: `${type}-${order}`, name, type, device: index, tags, path: location ?? path,
    date: timestamps[order], icon, snippet,
  }));
}

const documents = rows('文档', 0, ['团建费用', '团建'], documentPath, [
  ['团建行程规划.doc', 'word', '团建费用，本次团建共花费 5287 元，主要用在了交通上。高铁费用来回人均 532 元，打车费用人均 100 元。'],
  ['团建活动安排.ppt', 'powerpoint'],
  ['部门团建意外险购买统计.xls', 'excel'],
  ['各部门团建统计.xls', 'excel', null, 'D:\\ Project \\ 部门团建'],
]);

export const photos = Array.from({ length: 7 }, (_, index) => ({
  id: `photo-${index}`, name: '1721359452140.jpg', type: '图片', device: 1,
  tags: ['团建合照', '团建照片', '露营'], cover: `photo${index}`, path: '手机存储 / DCIM / Camera',
  date: '2024/7/19 11:30',
}));

const videos = [
  ['小米 SU7 上市发布会.mp4', '2:12:05', '/videos/小米 SU7 上市发布会.mp4', 'su7-launch-cover', { start: 2960, end: 3002 }], ['小米汽车漂移.mp4', '20:39'],
  ['试驾小米SU7 Ultra.mp4', '48:19'], ['小米汽车官...球纪录诞生.mp4', '26:00'],
  ['小米 YU7 耐力测试.mp4', '18:00'], ['小米彭程路测曝光.mp4', '19:22'], ['小米 YU7 发布会.jpg', ''],
].map(([name, duration, source, cover, matchedSegment], index) => ({
  id: `video-${index}`, name, duration, source, matchedSegment, type: duration ? '视频' : '图片', section: '视频', device: 0,
  cover: cover || `video${index}`, tags: ['汽车漂移', '小米汽车'], path: 'D:\\ 视频 \\ 小米汽车', date: timestamps[0],
}));

const audio = rows('音频', 1, ['本周待办', '需求评审'], audioPath, [
  ['设计部周例会_9.20.m4a', 'audio', '本周待办：1.完成初版方案设计；2.组织设计部内部设计评审；3.和需求方达成共识进行设计交付'],
  ['互联互通 PC 需求评审.m4a', 'audio'],
  ['小米 AI 文件搜索需求评审.m4a', 'audio'],
  ['需求管理平台需求评审.m4a', 'audio'],
]);

const folders = rows('文件夹', 0, ['Blender', '3D'], folderPath, [
  ['Blender', 'folder'], ['Blender · 基础教程', 'folder'], ['Blender · 练习素材', 'folder'], ['Blender · 工程文件', 'folder'],
]);

const archives = rows('压缩包', 0, ['Adobe Photoshop 2026', 'Adobe'], archivePath, [
  ['Adobe Photoshop 2026 27.6.1.zip', 'zip'], ['Adobe Photoshop 2026 安装补丁.zip', 'zip'], ['Adobe GenP 3.6.9 破解器.zip', 'zip'],
]);

const files = [...documents, ...photos, ...videos, ...audio, ...folders, ...archives];

export function findFiles(query, device) {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return files.filter((file) => {
    if (file.device !== device) return false;
    const index = [file.name, file.type, file.snippet, ...file.tags].join(' ').toLocaleLowerCase();
    return terms.every((term) => index.includes(term));
  });
}

export function preferredDevice(query, current) {
  if (findFiles(query, current).length) return current;
  const match = devices.findIndex((_, index) => findFiles(query, index).length);
  return match >= 0 ? match : current;
}

export function groupFiles(files, useSections = false) {
  const groups = new Map();
  for (const file of files) {
    const key = useSections && file.section ? file.section : file.type;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(file);
  }
  return [...groups];
}
