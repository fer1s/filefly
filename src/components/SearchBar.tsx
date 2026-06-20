import { useStateContext } from '../providers/StateProvider'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

import '../styles/components/SearchBar.css'

const SearchBar = () => {
  const { search, setSearch } = useStateContext()

  return (
    <div className='SearchBar'>
      <input type='text' placeholder='Search...' value={search} onChange={(e) => setSearch(e.target.value)} />
      {search && (
        <button className='clear' onClick={() => setSearch('')} aria-label='Clear search'>
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
    </div>
  )
}

export default SearchBar
