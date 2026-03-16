function InfoPopup({ title, rows }) {
  return (
    <div className="info-popup">
      <h4>{title}</h4>
      {rows.map(({ label, value }, index) => (
        <div key={index} className="info-row">
          <span className="label">{label}</span>
          <span className="value">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default InfoPopup;
