function Home() {
  return (
    <div className="flex flex-wrap gap-2">
      <h3 className="text-3xl">outflow.lol</h3>
      <p>
        JSON Marshaling in Go Here's what you need to know about Go's JSON
        marshaling functions: json.Marshal The most common approach. It converts
        a Go value (struct, map, slice, etc.) into a []byte containing JSON
        data. It returns both the byte slice and an error. When to use: When you
        need JSON as bytes in memory—for sending over HTTP, storing temporarily,
        or passing to another function. json.Encoder (likely what you meant by
        "MarshalEncode") This is the streaming approach. It writes JSON directly
        to an io.Writer without buffering the entire output in memory first.
        When to use: When you're writing to a file, network connection, or large
        datasets where you want to avoid holding the complete JSON in memory.
        json.MarshalIndent Not "MarshalWriter," but this function marshals with
        pretty-printing (indentation), useful for readable output. When to use:
        When you need formatted, human-readable JSON (like in logs or APIs that
        return pretty JSON).
      </p>
    </div>
  );
}

export default Home;
