import { useState } from "react";
import {
  loadOntologyFromObo,
  fetchSubclasses,
} from "./services/ontologyService";
import "./App.css";

function App() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const handleClassClick = async (cls) => {
    setSelectedClass(cls);
    try {
      const data = await fetchSubclasses(cls);
      if (data.success && data.subclasses) {
        console.log(`${cls} subclasses:`, data.subclasses);
      }
    } catch (err) {
      console.error(`Failed to fetch ${cls} subclasses:`, err);
    }
  };

  const handleLoadOntology = async () => {
    setLoading(true);
    setError(null);
    setClasses([]);
    setSelectedClass(null);
    try {
      const data = await loadOntologyFromObo();
      if (data.success && data.classes) {
        setClasses(data.classes);
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load ontology");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>BreedBase Ontology Visualizer</h1>
        <button onClick={handleLoadOntology} disabled={loading}>
          {loading ? "Loading..." : "Load Ontology"}
        </button>
      </header>
      <main>
        {error && <p className="error">{error}</p>}
        {classes.length > 0 && (
          <section className="ontology-classes">
            <h2>Select a central node</h2>
            <div className="class-buttons">
              {classes.map((cls) => (
                <button
                  key={cls}
                  className={selectedClass === cls ? "selected" : ""}
                  onClick={() => handleClassClick(cls)}
                >
                  {cls}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
