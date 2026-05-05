import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyVoca, removeFromMyVoca } from '../utils/storage'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

function VocaItem({ word, handleDelete, speakWord }) {
  const [showKo, setShowKo] = useState(false);
  const imgUrl = word.img ? `https://englishvocanote.pages.dev/${window.atob(word.img)}` : null;

  return (
    <div
      className="challenge-card voca-card"
      onClick={() => setShowKo(!showKo)}
    >
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={word.en}
          crossOrigin="anonymous"
          style={{ width: '30px', height: '30px', borderRadius: '10%', objectFit: 'cover', marginRight: '10px' }}
        />
      ) : (
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', marginRight: '10px' }} />
      )}

      <div className="word-en fade-in" style={{
        fontSize: showKo ? (word.ko.length > 10 ? '0.75rem' : '0.85rem') : '1rem',
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'left',
        color: showKo ? '#38bdf8' : 'white',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: '1.2',
        maxHeight: '32px',
        wordBreak: 'break-all'
      }}>
        {showKo ? word.ko : word.en}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
        <button
          className="dark-button"
          onClick={() => speakWord(word.en)}
          style={{ padding: '2px 8px', fontSize: '0.7rem', margin: 0, height: '26px' }}
        >
          🔈 발음
        </button>
        <button
          className="voca-delete-btn"
          onClick={() => handleDelete(word.en)}
          style={{ position: 'static', padding: '0 5px', fontSize: '1.2rem', color: '#f87171', border: 'none', background: 'none' }}
          title="삭제"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function MyVocabulary() {
  const [vocaList, setVocaList] = useState([])
  const [isExporting, setIsExporting] = useState(false)
  const navigate = useNavigate()
  const printRef = useRef()

  useEffect(() => {
    setVocaList(getMyVoca())
  }, [])

  const handleDelete = (en) => {
    removeFromMyVoca(en)
    setVocaList(getMyVoca())
  }

  const speakWord = (word) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  const exportToPDF = async () => {
    if (vocaList.length === 0) return
    setIsExporting(true)

    window.scrollTo(0, 0)

    setTimeout(async () => {
      try {
        const element = printRef.current
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 800,
          onclone: (clonedDoc) => {
            const el = clonedDoc.getElementById('pdf-print-area');
            if (el) el.style.display = 'block';
          }
        })

        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgWidth = 210
        const pageHeight = 297
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight

        let position = 0

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }

        pdf.save(`초등영어활용노트_단어장_${new Date().toLocaleDateString()}.pdf`)
      } catch (error) {
        console.error('PDF export failed:', error)
        alert('PDF 생성 중 오류가 발생했습니다.')
      } finally {
        setIsExporting(false)
      }
    }, 500)
  }

  return (
    <div className="container">
      <div className="home-body" style={{
        textAlign: 'center',
        paddingTop: '25px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }}>
        <h1 className="home-title">나만의 <span className="title-gradient-accent">단어장</span></h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '30px', marginBottom: '30px' }}>
          <p style={{ color: '#8b98a5', margin: 0 }}>저장된 단어: {vocaList.length}개</p>
          {vocaList.length > 0 && (
            <button
              className="dark-button"
              onClick={exportToPDF}
              disabled={isExporting}
              style={{ padding: '5px 10px', fontSize: '0.65rem', background: '#38bdf8', color: '#1a1a2e', fontWeight: 'bold' }}
            >
              {isExporting ? '생성 중...' : '📥 PDF 저장'}
            </button>
          )}
        </div>

        {vocaList.length === 0 ? (
          <div className="challenge-card" style={{ 
            padding: '30px 20px', 
            background: '#1a1f2e', 
            borderRadius: '25px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 15px 30px rgba(0,0,0,0.4)',
            maxWidth: '280px',
            marginTop: '15px',
            width: '85%'
          }}>
            <div style={{ 
              fontSize: '1.2rem', 
              fontWeight: 'bold', 
              color: '#facc15', 
              textShadow: '0 0 10px rgba(250, 204, 21, 0.4)',
              marginBottom: '15px'
            }}>
              저장된 단어가 없습니다.
            </div>
            <p style={{ 
              color: '#94a3b8', 
              fontSize: '0.85rem', 
              lineHeight: '1.4',
              marginBottom: '25px'
            }}>
              학습 중에 ⭐ 버튼을 눌러<br/>단어를 추가해 보세요!
            </p>
            <button 
              className="dark-button" 
              style={{ 
                padding: '8px 20px', 
                fontSize: '0.9rem',
                fontWeight: 'bold',
                borderRadius: '10px',
                background: '#2d334a',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer'
              }} 
              onClick={() => navigate('/')}
            >
              학습하러 가기
            </button>
          </div>
        ) : (
          <>
            <div className="voca-list-container">
              {vocaList.map((word, idx) => (
                <VocaItem
                  key={idx}
                  word={word}
                  handleDelete={handleDelete}
                  speakWord={speakWord}
                />
              ))}
            </div>

            <div style={{ position: 'fixed', top: '200%', left: 0, width: '794px', zIndex: -1000 }}>
              <div id="pdf-print-area" ref={printRef} style={{
                width: '794px',
                padding: '40px',
                background: 'white',
                color: 'black',
                fontFamily: 'sans-serif',
                boxSizing: 'border-box',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '35px', paddingBottom: '15px', borderBottom: '2px solid #0ea5e9' }}>
                  <h1 style={{ color: '#0ea5e9', margin: 0, marginTop: '60px', fontSize: '1.5rem', letterSpacing: '-1px', lineHeight: '1.3' }}>초등영어<br />활용노트</h1>

                  <table style={{ borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.9rem', color: '#1e293b', background: 'white', marginBottom: '15px' }}>
                    <tbody>
                      <tr style={{ height: '35px' }}>
                        <th style={{ border: '1px solid #cbd5e1', padding: '0 12px', verticalAlign: 'middle', background: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>학교</th>
                        <td style={{ border: '1px solid #cbd5e1', width: '100px', verticalAlign: 'middle' }}></td>
                        <th style={{ border: '1px solid #cbd5e1', padding: '0 12px', verticalAlign: 'middle', background: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>학년/반</th>
                        <td style={{ border: '1px solid #cbd5e1', width: '70px', verticalAlign: 'middle' }}></td>
                        <th style={{ border: '1px solid #cbd5e1', padding: '0 12px', verticalAlign: 'middle', background: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>번호</th>
                        <td style={{ border: '1px solid #cbd5e1', width: '60px', verticalAlign: 'middle' }}></td>
                        <th style={{ border: '1px solid #cbd5e1', padding: '0 12px', verticalAlign: 'middle', background: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>이름</th>
                        <td style={{ border: '1px solid #cbd5e1', width: '100px', verticalAlign: 'middle' }}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ width: '100%' }}>
                  {vocaList.map((word, idx) => {
                    const imgUrl = word.img ? `https://englishvocanote.pages.dev/${window.atob(word.img)}` : null;
                    const isEven = idx % 2 === 0;

                    return (
                      <div key={idx} style={{
                        float: 'left',
                        display: 'block',
                        width: '340px',
                        height: '110px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        background: '#ffffff',
                        position: 'relative',
                        boxSizing: 'border-box',
                        marginLeft: isEven ? '0px' : '34px',
                        marginBottom: '34px',
                        textAlign: 'left'
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: '15px',
                          top: '15px',
                          width: '80px',
                          height: '80px',
                          background: 'none',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {imgUrl ? (
                            <img src={imgUrl} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          ) : (
                            <span style={{ fontSize: '1.5rem' }}>🖼️</span>
                          )}
                        </div>

                        <div style={{
                          position: 'absolute',
                          left: '110px',
                          top: '20px', 
                          width: '215px'
                        }}>
                          <div style={{
                            fontSize: '1.4rem',
                            fontWeight: 'bold',
                            color: '#1e293b',
                            marginBottom: '6px',
                            wordBreak: 'break-word',
                            lineHeight: '1.2'
                          }}>
                            {word.en}
                          </div>
                          <div style={{
                            fontSize: '1rem',
                            color: '#64748b',
                            wordBreak: 'break-word',
                            lineHeight: '1.2'
                          }}>
                            {word.ko}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ clear: 'both' }}></div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '30px', color: '#94a3b8', fontSize: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '20px', clear: 'both' }}>
                  Generated on {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MyVocabulary
