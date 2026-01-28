import { useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import { fetchOntologyHierarchy } from "../services/ontologyService";

const OntologyGraph = ({ cvId }) => {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cvId) return;

    const loadOntologyData = async () => {
      try {
        setLoading(true);
        const data = await fetchOntologyHierarchy(cvId);

        const nodes = new DataSet(
          data.terms.map((term) => ({
            id: term.cvterm_id,
            label: term.name,
            title: term.definition || term.name,
            shape: "box",
          }))
        );

        const edges = new DataSet(
          data.relationships.map((rel, idx) => ({
            id: idx,
            from: rel.subject_id,
            to: rel.object_id,
            label: rel.relationship_type,
            arrows: "to",
          }))
        );

        const graphData = { nodes, edges };

        const options = {
          layout: {
            hierarchical: {
              direction: "UD",
              sortMethod: "directed",
            },
          },
          physics: false,
          nodes: {
            font: { size: 14 },
          },
        };

        if (containerRef.current) {
          networkRef.current = new Network(
            containerRef.current,
            graphData,
            options
          );
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadOntologyData();

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, [cvId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div ref={containerRef} style={{ height: "600px", width: "100%" }} />;
};

export default OntologyGraph;
