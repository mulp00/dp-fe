import React from 'react';
import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import {Register} from './Pages'
// Import other components like Home and Login

const App: React.FC = () => {
  return (
      <Router>
        <Routes>
          <Route index path="/" element={<Register/>} />
          {/* Define routes for other components like Home and Login */}
          {/* <Route path="/login" component={Login} /> */}
          {/* <Route path="/" component={Home} /> */}
        </Routes>
      </Router>
  );
};

export default App;
