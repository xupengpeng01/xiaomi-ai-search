import './globals.css';

export const metadata = {
  title: 'AI 文件搜索',
  description: '小米 AI 文件搜索交互演示',
  icons: { icon: '/figma/title.svg' },
};

export default function RootLayout({ children }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
