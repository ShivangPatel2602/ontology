import { useState, useEffect } from "react";
import OntologyGraph from "./components/OntologyGraph";
import { fetchOntologies } from "./services/ontologyService";
import "./App.css";

function App() {
  const [ontologies, setOntologies] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState(null);

  useEffect(() => {
    const loadOntologies = async () => {
      try {
        const data = await fetchOntologies();
        setOntologies(data);
        if (data.length > 0) {
          setSelectedCvId(data[0].cv_id);
        }
      } catch (err) {
        console.error("Error loading ontologies:", err);
      }
    };
    loadOntologies();
  }, []);

  return (
    <div className="App">
      <header>
        <h1>BreedBase Ontology Visualizer</h1>
        <select
          value={selectedCvId || ""}
          onChange={(e) => setSelectedCvId(Number(e.target.value))}
        >
          <option value="">Select an ontology...</option>
          {ontologies.map((ont) => (
            <option key={ont.cv_id} value={ont.cv_id}>
              {ont.name}
            </option>
          ))}
        </select>
      </header>
      <main>{selectedCvId && <OntologyGraph cvId={selectedCvId} />}</main>
    </div>
  );
}

export default App;
