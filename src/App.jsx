import { InteractiveGlobe } from "./InteractiveGlobe";

function App() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <h1 style={{ textAlign: "center", with: "100%" }}>
        This is an example provided by freelancer Shuai X.
      </h1>
      <InteractiveGlobe />
    </div>
  );
}

export default App;
