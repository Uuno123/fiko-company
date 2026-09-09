import './CategoryFilter.css'

function CategoryFilter({ categories, active, onChange }) {
  return (
    <div className="category-filter" role="tablist" aria-label="Suodata ruokalajin mukaan">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          role="tab"
          aria-selected={active === category}
          className={`category-chip${active === category ? ' category-chip--active' : ''}`}
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
    </div>
  )
}

export default CategoryFilter
