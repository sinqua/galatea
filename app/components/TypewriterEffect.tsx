import React, { useEffect, useState, useRef } from 'react';

interface TypewriterEffectProps {
  text: string;
  cursorChar?: string;
  typingSpeed?: number;
}

const TypewriterEffect: React.FC<TypewriterEffectProps> = ({ 
  text, 
  cursorChar = '▎', 
  typingSpeed = 20 
}) => {
  const [visibleText, setVisibleText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const textRef = useRef(text);
  const positionRef = useRef(0);
  const lastUpdateRef = useRef(0);

  // 텍스트가 변경되면 참조 업데이트
  useEffect(() => {
    textRef.current = text;
    // 텍스트가 완전히 새로 시작되면 위치 리셋
    if (!text.startsWith(visibleText)) {
      positionRef.current = 0;
      setVisibleText('');
    }
  }, [text]);

  // 타이핑 애니메이션 구현
  useEffect(() => {
    // 표시된 텍스트가 이미 현재 텍스트와 일치하면 애니메이션 중단
    if (visibleText === textRef.current) {
      return;
    }

    const now = Date.now();
    // 마지막 업데이트로부터 일정 시간이 지났는지 확인
    if (now - lastUpdateRef.current < typingSpeed) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      // 실제 텍스트 길이보다 짧은 경우만 업데이트
      if (positionRef.current < textRef.current.length) {
        setVisibleText(textRef.current.substring(0, positionRef.current + 1));
        positionRef.current += 1;
        lastUpdateRef.current = now;
      }
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [visibleText, typingSpeed, text]);

  // 커서 깜빡임 효과
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="font-mono">
      {visibleText}
      {showCursor && visibleText !== textRef.current && (
        <span className="inline-block animate-pulse font-light">{cursorChar}</span>
      )}
    </div>
  );
};

export default TypewriterEffect;
