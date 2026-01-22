import { BrowserRouter, Routes, Route } from "react-router-dom"
import ExpenseLogger from "./pages/ExpenseLogger"
import Chat from "./pages/Chat"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExpenseLogger />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  )
}
