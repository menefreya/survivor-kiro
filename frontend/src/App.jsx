import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Home from './components/Home';
import Ranking from './components/Ranking';
import Profile from './components/Profile';
import Admin from './components/Admin';
import PredictionInterface from './components/PredictionInterface';
import PredictionHistory from './components/PredictionHistory';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <a href="#main-content" className="skip-to-main">
            Skip to main content
          </a>
          <Navigation />
          <main id="main-content" className="main-content">
            <Routes>
              <Route path="/signup" element={<SignUp />} />
              <Route path="/login" element={<Login />} />
              <Route 
                path="/home" 
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/ranking" 
                element={
                  <ProtectedRoute>
                    <Ranking />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/predictions" 
                element={
                  <ProtectedRoute>
                    <PredictionInterface />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/predictions/history" 
                element={
                  <ProtectedRoute>
                    <PredictionHistory />
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
