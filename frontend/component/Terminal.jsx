import React, { useState, useEffect, useRef } from 'react';
import './Terminal.css';
import TerminalHeader from './TerminalHeader';
import {
  auth,
  googleProvider,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
  db
} from './firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

function Terminal() {
  const [typedCommand, setTypedCommand] = useState('');
  const [terminalLines, setTerminalLines] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [apis, setApis] = useState([]);
  const terminalRef = useRef(null);
  const scrollRef = useRef(null);

  // Auto-scroll when terminal lines update
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        setUserEmail(user.email);
        const userDocRef = doc(db, 'users', user.email);
        const userSnap = await getDoc(userDocRef);
        const userApis = userSnap.exists() ? userSnap.data().apis || [] : [];
        setApis(userApis);
        setTerminalLines([
          `✅ You are logged in as ${user.email}`,
          '',
          ...getAvailableCommands(true)
        ]);
      } else {
        setIsLoggedIn(false);
        setUserEmail('');
        setApis([]);
        setTerminalLines([
          '👋 Logged out successfully',
          '',
          ...getAvailableCommands(false)
        ]);
      }
    });
    return () => unsubscribe();
  }, []);

  const getAvailableCommands = (loggedIn) => {
    return loggedIn
      ? [
          'API Management Commands:',
          '- "AddApi <http(s)://url>" - Add API endpoint to ping',
          '- "RemoveApi <id>" - Remove API endpoint',
          '- "ListApis" - View all registered APIs',
          '- "Logout" - Sign out from your account',
          ''
        ]
      : ['Available Commands:', '- "google" - Login with Google', ''];
  };

  const googleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setTerminalLines(prev => [...prev, `❌ Google login failed: ${error.message}`]);
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      setTerminalLines(prev => [...prev, `❌ Logout failed: ${error.message}`]);
    }
  };

  const addApi = async (url) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return '❌ Invalid URL. Only HTTP and HTTPS URLs are allowed.';
    }

    const userDocRef = doc(db, 'users', userEmail);
    const userSnap = await getDoc(userDocRef);
    let currentApis = [];

    if (userSnap.exists()) {
      currentApis = userSnap.data().apis || [];
    }

    if (currentApis.length >= 2) {
      return '⚠️ Maximum 2 APIs allowed. Remove one to add a new.';
    }

    const newApi = {
      id: Date.now(),
      url: url,
      lastPing: 'Never',
      status: 'Pending'
    };

    await setDoc(userDocRef, {
      apis: arrayUnion(newApi)
    }, { merge: true });

    setApis([...currentApis, newApi]);
    return `✅ API added: ${url} (ID: ${newApi.id})`;
  };

  const removeApi = async (id) => {
    const userDocRef = doc(db, 'users', userEmail);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) return `❌ No APIs found for user`;

    const currentApis = userSnap.data().apis || [];
    const apiToRemove = currentApis.find(api => api.id === parseInt(id));

    if (!apiToRemove) return `❌ API with ID ${id} not found`;

    await updateDoc(userDocRef, {
      apis: arrayRemove(apiToRemove)
    });

    setApis(currentApis.filter(api => api.id !== parseInt(id)));
    return `✅ API removed: ${apiToRemove.url}`;
  };

  const listApis = async () => {
    const userDocRef = doc(db, 'users', userEmail);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) return 'No APIs registered yet';

    const currentApis = userSnap.data().apis || [];
    setApis(currentApis);

    if (currentApis.length === 0) return 'No APIs registered yet';

    return currentApis.map(api =>
      `ID: ${api.id} | URL: ${api.url} | Status: ${api.status} | Last Ping: ${api.lastPing}`
    ).join('\n');
  };

  const handleCommand = async () => {
    const cmd = typedCommand.trim();
    const cmdLower = cmd.toLowerCase();
    let newLines = [...terminalLines, `APIHeartbeat:~$ ${typedCommand}`];
  
    if (cmdLower === 'start') {
      newLines.push(...getAvailableCommands(isLoggedIn));
    } else if (cmdLower === 'clear') {
      newLines = []; // Clear terminal output
    } else if (cmdLower.startsWith('addapi ')) {
      if (!isLoggedIn) {
        newLines.push('⚠️ Please log in first.');
      } else {
        const url = cmd.substring(7).trim();
        if (url) {
          const result = await addApi(url);
          newLines.push(result);
        } else {
          newLines.push('⚠️ Please provide a URL.');
        }
      }
      newLines.push(...getAvailableCommands(true));
    } else if (cmdLower.startsWith('removeapi ')) {
      if (!isLoggedIn) {
        newLines.push('⚠️ Please log in first.');
      } else {
        const id = cmd.substring(10).trim();
        if (id) {
          const result = await removeApi(id);
          newLines.push(result);
        } else {
          newLines.push('⚠️ Please provide an API ID.');
        }
      }
      newLines.push(...getAvailableCommands(true));
    } else if (cmdLower === 'listapis') {
      if (!isLoggedIn) {
        newLines.push('⚠️ Please log in first.');
      } else {
        const apiList = await listApis();
        newLines.push(apiList);
      }
      newLines.push(...getAvailableCommands(true));
    } else if (cmdLower === 'google') {
      if (isLoggedIn) {
        newLines.push('⚠️ Already logged in.');
      } else {
        await googleLogin();
      }
    } else if (cmdLower === 'logout') {
      if (isLoggedIn) {
        await logoutUser();
      } else {
        newLines.push("⚠️ You're not logged in.");
      }
      newLines.push(...getAvailableCommands(false));
    } else {
      newLines.push(`❓ Unknown command: ${typedCommand}`);
      newLines.push('Type "start" to see available commands');
    }
  
    setTerminalLines(newLines);
    setTypedCommand('');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey) return; // skip to allow paste
      if (e.key === 'Enter') {
        handleCommand();
      } else if (e.key === 'Backspace') {
        setTypedCommand(prev => prev.slice(0, -1));
      } else if (e.key.length === 1) {
        setTypedCommand(prev => prev + e.key);
      }
    };
  
    const handlePaste = (e) => {
      const pasteText = e.clipboardData.getData('text');
      setTypedCommand(prev => prev + pasteText);
      e.preventDefault(); // prevent default paste behavior (optional)
    };
  
    const terminal = terminalRef.current;
    document.addEventListener('keydown', handleKeyDown);
    terminal?.addEventListener('paste', handlePaste);
  
    terminal?.focus();
  
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      terminal?.removeEventListener('paste', handlePaste);
    };
  }, [typedCommand, terminalLines, isLoggedIn]);

  return (
    <div className="Container-main" tabIndex={0} ref={terminalRef}>
      <TerminalHeader />
      <div className="welcome-message">
        <h1>
          Welcome to <span className="highlight">APIHeartbeat</span> - Keep your APIs alive with automated pings
        </h1>
      </div>
      <div className="terminal-body">
        {terminalLines.map((line, index) => (
          <div key={index} className="terminal-line">{line}</div>
        ))}
        <div className="terminal-line">
          <span><strong>APIHeartbeat:~$</strong> </span>
          <span className="typed-command">{typedCommand}</span>
          <span className="blinking-cursor">|</span>
        </div>
        <div ref={scrollRef}></div>
      </div>
    </div>
  );
}

export default Terminal;

