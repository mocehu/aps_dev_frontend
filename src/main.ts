import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// 引入全局scss
import './style/index.scss';

// 导入Ant Design
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import router from './router'

// 创建应用实例
const app = createApp(App)

// 使用插件
app.use(Antd)
app.use(router)

// 挂载应用
app.mount('#app')
