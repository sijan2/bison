'use client'
import styles from './page.module.css'
import { useEffect, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { TypeAnimation } from 'react-type-animation'
import { SyncLoader } from 'react-spinners'
import useEventListener from '@use-it/event-listener'
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  const [recentChats, setRecentChats] = useState([])
  const [currentChat, setCurrentChat] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  //prompt fed to GPT in the beginning
  const systemPrompt = {
    role: 'system',
    content:
      "You are a factual, conversational chatbot for Georgetown University. The provided data is ONLY to be used if you don't have a specific answer.  NEVER SAY that you don't know or the requested information is not in the documents.  Again, this is only to be used if you don't have a specific answer. Also maintain a supportive tone to inform and support the high schooler users.",
  }

  //FAQs to be displayed when the user first opens the app
  const [faqs, setFaqs] = useState([
    'Do International Students need to submit SAT scores?',

    'What is the application deadline for 2024?',
  ])

  //enter key to submit search
  const handleKeyDown = (event) => {
    if (event.keyCode === 13 && loading == false) {
      submitSearch()
    }
  }

  useEventListener('keydown', handleKeyDown)

  //API key for Azure Search & Azure OpenAI
  const api_key = 'b6f9c0cfbd2c493f86743dfb6d1e3da4'
  const search_url = 'https://team20.search.windows.net'
  const search_key = '34NGtYQVlBK2m47yXobE4JMugTC7hMqVwKPjbvQIhWAzSeBGQuHm'

  //moves current chat to recent chats and clears current chat
  const newChatFunction = () => {
    setRecentChats((recentChats) => [...recentChats, currentChat])
    setCurrentChat([])
  }

  const populateCurrentChat = (index) => {
    setCurrentChat(recentChats[index])
  }

  //main submit search function
  const submitSearch = async () => {
    if (input == '') return

    //adds the spinner to the chat
    setLoading(true)

    //output the currentchat array

    //take the current input to query Azure Search

    //REST API call to Azure Search
    const payload = {
      dataSources: [
        {
          type: 'AzureCognitiveSearch',
          parameters: {
            endpoint: search_url,
            key: search_key,
            indexName: 'cosmosdb-index',
            inScope: false,
            roleInformation:
              "You are only to consult these documents if you don't have a specific answer.  NEVER SAY that you don't know or the requested information is not in the documents.  Again, this is only to be used if you don't have a specific answer.",
            topNDocuments: 3,
          },
        },
      ],
      messages: [
        systemPrompt,
        ...currentChat,
        { role: 'user', content: input },
      ],
      max_tokens: 600,
      stop: null,
      temperature: 1,
      inScope: false,
    }

    setCurrentChat((currentChat) => [
      ...currentChat,
      {
        role: 'user',
        content: input,
      },
    ])

    setInput('')

    //API call to Azure OpenAI
    const res = await fetch(
      'https://studio205859928605.openai.azure.com/openai/deployments/gpt-4/extensions/chat/completions?api-version=2023-08-01-preview',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': api_key,
        },
        body: JSON.stringify(payload),
      }
    )

    if (res.status != 200) {
      //if the response is not 200, then we have an error
      console.log('Error with Azure Search')
      console.log(res)
      setLoading(false)

      setCurrentChat((currentChat) => [
        ...currentChat,
        {
          role: 'assistant',
          content: 'Sorry, there was an error. Please try again.',
        },
      ])
      return
    }

    const data = await res.json()

    console.log(data)

    //get the response text from the first choice
    let responseText = data.choices[0].message.content

    //remove any substrings that are [doc1]
    responseText = responseText.replace(/\[doc\d\]/g, '')

    //parses the relevant links from the context
    if (data.choices[0].message.context) {
      responseText += '\n\n\n**Relevant Links**'
      console.log('CONTEXT')
      JSON.parse(
        data.choices[0].message.context.messages[0].content
      ).citations.forEach((citation) => {
        responseText += '\n\n' + `[${citation.url}](` + citation.url + `)`
      })
    }

    setCurrentChat((currentChat) => [
      ...currentChat,
      {
        role: 'assistant',
        content: responseText,
      },
    ])

    console.log(currentChat)
    setLoading(false)
  }

  return (
    <main className={styles.main}>
      <div className={styles.left}>
        <div className="flex p-8 text-3xl">Bison Connect</div>
        <div className={styles.chats}>
          <button className={styles.newChat} onClick={newChatFunction}>
            <p>New Chat</p>
            <AddIcon />
          </button>
          <h3>Recent Chats</h3>
          <div className={styles.newChats}>
            {recentChats.map((chat, index) => (
              <div
                className={styles.chat}
                key={index}
                onClick={() => populateCurrentChat(index)}
              >
                <p>
                  {chat.length > 0
                    ? chat[0]?.content.substring(0, 24) + '...'
                    : 'New Chat'}
                </p>
                <KeyboardArrowRightIcon />
              </div>
            ))}
          </div>
        </div>
        <div className=" bottom-0 sticky items-center justify-between space-x-40 flex flex-row mt-auto p-8 text-3xl">
          <div>
            <Link href="https://discord.gg/9K79b8B3Y7">
              <Image
                src="/discord.png"
                alt="Discord Image"
                width={50}
                height={50}
              />
            </Link>
          </div>
          <div>
            <Link href="https://groupme.com/join_group/86671176/dyJFyIMO">
              <Image
                src="/groupme.png"
                alt="Group Me Image"
                width={50}
                height={50}
              />
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        {currentChat.length == 0 ? (
          <div className={styles.faq}>
            {faqs.map((faq) => (
              <div
                key={faqs}
                className={styles.faqItem}
                onClick={() => {
                  //first call set input, then submit search after set input
                  setInput(faq)
                }}
              >
                <h5>Popular Question</h5>
                <p>{faq}</p>
                <ArrowForwardIcon />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.chatbubbles} id="chatbubbles">
            {currentChat.map((chat) => {
              if (chat.role == 'user') {
                return (
                  <div key={chat} className={styles.userchat}>
                    <h5>You</h5>
                    <p>{chat.content}</p>
                  </div>
                )
              } else {
                return (
                  <div key={chat} className={styles.botchat}>
                    <div className={styles.botchattitle}>
                      <Image width={80} height={80} src="/logo.png" alt="1" />
                      <h5>Bison Buddy</h5>
                    </div>
                    <ReactMarkdown className={styles.markdown}>
                      {chat.content}
                    </ReactMarkdown>
                  </div>
                )
              }
            })}
            {loading && (
              <SyncLoader loading={loading} size={14} color="#c3dff5" />
            )}
            <div id="anchor"></div>;
          </div>
        )}
        {currentChat.length == 0 ? (
          <div className=" w-[300px] h-[300px] translate-x-[480px] -translate-y-96  relative">
            <Image src="/logo.png" alt="My Image" fill />
            <p className="translate-y-48 translate-x-10 text-xl font-bold">
              <TypeAnimation
                sequence={[
                  'Welcome to Bison Connect',
                  'Ask me anything about Howard University',
                  'I am here to help you',
                ]}
                wrapper="span"
                speed={0}
                delay={1000}
                repeat={Infinity}
              />
            </p>
          </div>
        ) : null}
        <div className={styles.bottomchat}>
          <div className={styles.bottomchatcontainer}>
            <input
              type="text"
              placeholder="Message Bison Connect......."
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
              }}
            />
            <button className=" -translate-x-10 " onClick={submitSearch}>
              <ArrowForwardIcon />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
