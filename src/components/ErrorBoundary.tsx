'use client';
import React, { Component, ReactNode } from 'react';

interface State { hasError: boolean }
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 text-red-800 rounded">
          <h2>Hoppla, da ist etwas schiefgelaufen.</h2>
          <p>Bitte lade die Seite neu oder kontaktiere den Support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}