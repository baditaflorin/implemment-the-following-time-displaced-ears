import { mountApp } from './ui/app';
import './style.css';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Mount node #app missing from index.html');
}
mountApp(root);
