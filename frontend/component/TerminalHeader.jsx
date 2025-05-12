// TerminalHeader.js
import React from 'react';
import './Terminal.css';

function TerminalHeader() {
    return (
        <div className="terminal-header">
        <div className="mac-buttons">
          <span className="red"></span>
          <span className="yellow"></span>
          <span className="green"></span>
        </div>
        <div className="title-center">
          <span role="img" aria-label="folder" className="folder-icon">📁</span>
          <span className="folder-name">APIHeartbeat</span>
        </div>
      </div>
    );
}

export default TerminalHeader;
