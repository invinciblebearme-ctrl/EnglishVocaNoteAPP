import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import WordChallenge from './pages/WordChallenge'
import ListenQuiz from './pages/ListenQuiz'
import ScrambleHome from './pages/ScrambleHome'
import ScrambleGame from './pages/ScrambleGame'
import MyVocabulary from './pages/MyVocabulary'
import Review from './pages/Review'
import ClassMode from './pages/ClassMode'
import Worksheet from './pages/Worksheet'
import MyClass from './pages/MyClass'
import Teacher from './pages/Teacher'
import Navbar from './components/Navbar'
import GradeNav from './components/GradeNav'

function App() {
  return (
    <Router>
      <Navbar />
      <div style={{ marginTop: '20px' }}>
        <GradeNav />
      </div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/challenge/:id" element={<WordChallenge />} />
        <Route path="/listen-quiz/:id" element={<ListenQuiz />} />
        <Route path="/scramble" element={<ScrambleHome />} />
        <Route path="/scramble-game/:id" element={<ScrambleGame />} />
        <Route path="/my-voca" element={<MyVocabulary />} />
        <Route path="/review" element={<Review />} />
        <Route path="/class/:id" element={<ClassMode />} />
        <Route path="/worksheet/:id" element={<Worksheet />} />
        <Route path="/my-class" element={<MyClass />} />
        <Route path="/teacher" element={<Teacher />} />
      </Routes>
    </Router>
  )
}

export default App
