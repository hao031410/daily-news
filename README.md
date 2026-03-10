# 📰 Daily News

每日新闻站点，自动抓取 60s 看世界 和 AI 资讯。

## 功能

- 📱 双板块：60s 看世界 + AI 资讯快报
- 📅 历史归档：查看过往新闻
- ⏰ 自动更新：每天 08:00 和 10:00 自动抓取
- 🚀 GitHub Pages 部署

## 本地开发

```bash
# 克隆仓库
git clone https://github.com/hao031410/daily-news.git
cd daily-news

# 直接打开 index.html 或使用本地服务器
python3 -m http.server 8000
```

## 技术栈

- 纯静态 HTML/CSS/JS
- GitHub Actions 定时任务
- 60s API 数据源

## 部署

自动部署到 GitHub Pages，访问地址：
`https://hao031410.github.io/daily-news/`
