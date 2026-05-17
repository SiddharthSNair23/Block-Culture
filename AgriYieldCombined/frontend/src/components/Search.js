const Search = () => {
    return (
        <header>
            <h2 className="header__title">Search it. Explore it. Grow it.</h2>
            <input
                type="text"
                className="header__search"
                placeholder="Enter the crop you would want to search for..."
            />
        </header>
    );
}

export default Search;