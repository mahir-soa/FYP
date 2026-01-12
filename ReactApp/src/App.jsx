import { useEffect, useState } from "react"
import axios from "axios"

function App() {
  const [status, setStatus] = useState("loading")

  useEffect(() => {
    axios
      .get("http://localhost:8080/api/health")
      .then(res => setStatus(res.data))
      .catch(() => setStatus("error"))
  }, [])

  return (
    <div style={{ padding: "2rem" }}>
      <h1>FYP Backend Status</h1>
      <p>{status}</p>
    </div>
  )
}

export default App
