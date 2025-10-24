// Predefined metadata options (hashtags without #)
const metadataOptions = ['mbti', 'mbtimemes', 'entp', 'entj', 'intp', 'intj'];
const selectedMetadata = [];

// Populate metadata dropdown
const metadataContainer = document.getElementById('metadataContainer');
metadataOptions.forEach(option => {
  const div = document.createElement('div');
  div.className = 'metadata-option';
  div.textContent = option;
  div.onclick = () => {
    if (selectedMetadata.includes(option)) {
      selectedMetadata.splice(selectedMetadata.indexOf(option), 1);
      div.classList.remove('selected');
    } else {
      selectedMetadata.push(option);
      div.classList.add('selected');
    }
    document.getElementById('selectedMetadata').value = selectedMetadata.join(' ');
  };
  metadataContainer.appendChild(div);
});

// Auto-fill alt text from Pinterest Title
document.getElementById('pinterestTitle').addEventListener('input', (e) => {
  document.getElementById('altText').value = e.target.value;
});

// Fetch Pinterest boards on page load
async function fetchBoards() {
  try {
    const response = await fetch('/api/boards');
    const boards = await response.json();
    const boardSelect = document.getElementById('board');
    boardSelect.innerHTML = '<option value="">Select a board</option>';
    boards.forEach(board => {
      const option = document.createElement('option');
      option.value = board.id;
      option.textContent = board.name;
      boardSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error fetching boards:', error);
    document.getElementById('board').innerHTML = '<option value="">Error loading boards</option>';
  }
}
fetchBoards();

// Handle form submission
document.getElementById('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const metadata = selectedMetadata.map(tag => `#${tag}`).join(' ');
  const url = document.getElementById('url').value;
  const description = `${name} ${metadata} ${url}`.trim();
  const title = document.getElementById('pinterestTitle').value;
  const boardId = document.getElementById('board').value;
  const altText = document.getElementById('altText').value;
  
  try {
    const response = await fetch('/api/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, boardId, description, mediaUrl: url, altText }),
    });
    const result = await response.json();
    document.getElementById('result').textContent = response.ok ? `Success! Pin ID: ${result.pinId}` : `Error: ${result.error}`;
  } catch (error) {
    document.getElementById('result').textContent = `Error: ${error.message}`;
  }
});