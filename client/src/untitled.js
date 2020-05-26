        <Map
          ref={this.myRef}
          style="mapbox://styles/mapbox/dark-v10"
          center= {[-97,39]}          
          containerStyle={{
            height: '75vh',
            width: '99vw'
          }}
          zoom={[3]}
          id='map'
        >
        {geojson.length <= 0 
        ? 'NO GEOJSON'
        : geojson.map((gl, index) => (
          <GeoJSONLayer key={index}
            data={gl.geojson}
            fillPaint={gl.fillPaint}
            linePaint={linePaint}
          />
          ))}
        </Map> 