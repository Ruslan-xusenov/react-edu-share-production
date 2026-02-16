# 🎓 EduShare School - Frontend

Modern React frontend for EduShare educational platform.

## 🚀 Features

- ⚡ **Vite** - Lightning fast build tool
- ⚛️ **React 19** - Latest React features
- 🎨 **Modern UI** - Beautiful, responsive design
- 🎭 **Framer Motion** - Smooth animations
- 📱 **Responsive** - Works on all devices
- 🔍 **SEO Optimized** - Meta tags, OpenGraph, Structured data
- 🎯 **React Router** - Client-side routing
- 📡 **Axios** - API integration with Django backend

## 🛠️ Tech Stack

- **React 19.2** - UI library
- **Vite 7.3** - Build tool
- **React Router DOM** - Routing
- **Framer Motion** - Animations
- **React Icons** - Icon library
- **Axios** - HTTP client
- **React Helmet Async** - SEO meta tags

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=EduShare School
VITE_APP_DESCRIPTION=Students Teaching Students
```

## 📁 Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── Navbar/
│   │   └── Footer/
│   ├── pages/           # Page components
│   │   └── HomePage/
│   ├── config/          # Configuration files
│   │   └── api.js       # API configuration
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
└── vite.config.js       # Vite configuration
```

## 🎨 Design System

### Colors
- **Primary**: #6366f1 (Indigo)
- **Secondary**: #f59e0b (Amber)
- **Success**: #10b981 (Emerald)
- **Danger**: #ef4444 (Red)

### Typography  
- **Font Family**: Inter, Outfit (Google Fonts)
- **Headings**: 700-900 weight
- **Body**: 400-500 weight

### CSS Variables
All design tokens are defined in CSS custom properties for easy theming.

## 🔗 API Integration

The frontend connects to Django backend via Axios. Configure the base URL in `.env`:

```javascript
// src/config/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL;
```

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

## 🎭 Animations

Powered by Framer Motion:
- Page transitions
- Component animations
- Hover effects
- Scroll animations

## 🔍 SEO Features

- Meta tags for all pages
- Open Graph tags
- Twitter Cards
- Structured data (JSON-LD)
- Canonical URLs
- Sitemap ready

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Serve Static Files

You can serve the built files with any static file server or integrate with Django.

### Django Integration

To serve React from Django:

1. Build the frontend: `npm run build`
2. Copy `dist/` contents to Django `static/` folder
3. Update Django templates to serve the built files

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 👨‍💻 Development

```bash
# Start dev server
npm run dev

# Lint code
npm run lint

# Format code (if configured)
npm run format
```

## 📝 License

MIT License - see main project LICENSE file.

## 🙏 Credits

- **UI Design**: Modern web design principles
- **Icons**: React Icons
- **Fonts**: Google Fonts (Inter, Outfit)
- **Animations**: Framer Motion

---

**Made with ❤️ for EduShare School**