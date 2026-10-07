import React from 'react';
import { isChunkLoadError, reloadOnceForNewVersion } from '../utils/appVersion';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Fichier du site introuvable après une mise en ligne : rechargement unique
    if (isChunkLoadError(error) && reloadOnceForNewVersion()) return;
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      // Lazy import to avoid circular deps
      const ServerError = React.lazy(() => import('../pages/ServerError'));
      return (
        <React.Suspense fallback={null}>
          <ServerError />
        </React.Suspense>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
